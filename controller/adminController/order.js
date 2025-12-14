const model = require("../../src/config");
const helper = require("../../helpers/orderhelper");

const orderMangementPageLoad = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 3;
    const search = (req.query.search || "").trim();
    const status = req.query.status || "All Statuses";
    const sort = req.query.sort || "Newest First";

    const Order = model.orderModel;
    if (!Order) {
      console.error("orderModel not found");
      return res.status(500).send("Server Error");
    }

    const filter = {};
    if (status && status !== "All Statuses") {
      filter.orderStatus = status;
    }
    if (search) {
      const searchRegex = new RegExp(search, "i");
      const maybeNumber = Number(search);
      filter.$or = [
        { "shippingAddress.title": searchRegex },
        !Number.isNaN(maybeNumber) ? { orderId: maybeNumber } : null,
      ].filter(Boolean);
    }

    let sortOption = { createdAt: -1 };
    if (sort === "Oldest First") sortOption = { createdAt: 1 };
    else if (sort === "Amount: High to Low") sortOption = { finalAmount: -1 };
    else if (sort === "Amount: Low to High") sortOption = { finalAmount: 1 };

    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter).populate("userId").sort(sortOption).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalOrders / limit));

    const countOrders = await Order.countDocuments();

    const revenueResult = await Order.aggregate([{ $group: { _id: null, totalRevenue: { $sum: "$finalAmount" } } }]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    const deliveredCount = await Order.countDocuments({ orderStatus: "Delivered" });
    const pendingCount = await Order.countDocuments({ orderStatus: "Pending" });

    res.render("admin/ordermanagement", {
      orders,
      currentPage: page,
      totalPages,
      totalOrders,
      search,
      status,
      sort,
      countOrders,
      totalRevenue,
      deliveredCount,
      pendingCount,
    });
  } catch (error) {
    console.error("orderMangementPageLoad error:", error);
    res.status(500).send("Server Error");
  }
};

const orderdetailsPageload = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    if (!orderId) return res.status(400).send("Missing order ID");

    const order = await model.orderModel.findById(orderId).populate("orderitems.productId");
    if (!order) return res.status(404).send("Order not found");

    let totalqty = order.orderitems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    res.render("admin/orderdetails", { order, totalqty });
  } catch (error) {
    console.error("orderdetailsPageload error:", error);
    res.status(500).send("Server Error");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status) {
      return res.status(400).json({ message: "Order ID and status are required" });
    }

    // Main shipping flow only
    const statusFlow = ["Pending", "Ordered", "Shipped",'Out For Delivery', "Delivered", "Cancelled"];
    if (!statusFlow.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await model.orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const newIndex = statusFlow.indexOf(status);
    let updateHappened = false;

    for (const item of order.orderitems) {
      // Skip items that are cancelled/returned or in a pure return flow
      if (
        item.status === "Cancelled" ||
        item.status === "Returned" ||
        item.status === "Return Request" ||
        item.status === "Return Rejected"
      ) {
        continue;
      }

      // If item.status is not in the flow (e.g. "Out For Delivery"), treat as closest step
      let currentIndex = statusFlow.indexOf(item.status);
      if (currentIndex === -1) {
        if (item.status === "Out For Delivery") {
          currentIndex = statusFlow.indexOf("Shipped");
        } else {
          currentIndex = statusFlow.indexOf("Pending");
        }
      }

      if (newIndex > currentIndex) {
        item.status = status;
        updateHappened = true;
      } else if (newIndex < currentIndex) {
        return res.status(400).json({
          message: `Cannot revert status from ${item.status} to ${status}`,
        });
      }
    }

    if (updateHappened) {
      order.orderStatus = status;
      order.orderStatusUpdatedAt = new Date();
      order.markModified("orderitems");
      await order.save();
      return res
        .status(200)
        .json({ message: "Order status updated successfully", order });
    }

    return res.status(200).json({
      message: "No updates applied. All items already in correct status.",
      order,
    });
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


const returnChoesingPost = async (req, res) => {
  try {
    const { itemId, orderId, adminDecision, returnQty } = req.body;

    if (!adminDecision || !itemId || !orderId || returnQty == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const order = await model.orderModel
      .findById(orderId)
      .populate("orderitems.productId");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.orderitems.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in order" });
    }

    const userId = order.userId;

    let acceptedQty = 0;
    if (adminDecision === "Accept") {
      const maxAvailable = item.quantity - (item.cancelledQuantity || 0);
      acceptedQty = Math.min(returnQty, maxAvailable);
      
      if (acceptedQty <= 0) {
        return res.status(400).json({ message: "No quantity left to return" });
      }

      item.returnedQuantity =acceptedQty;
      item.status = item.returnedQuantity === item.quantity ? "Returned" : "Return Accepted";

      // Wallet refund
      let wallet = await model.walletModel.findOne({ customerId: userId });
      const creditAmount = (item.price || 0) * acceptedQty;
      const remark = `Return Accepted for ${item.productId?.productName || "Product"} (Qty: ${acceptedQty})`;

      if (!wallet) {
        wallet = new model.walletModel({
          customerId: userId,
          credited: creditAmount,
          debited: 0,
          totalBalance: creditAmount,
          transactions: [{ type: "credit", amount: creditAmount, remark }],
        });
      } else {
        wallet.credited += creditAmount;
        wallet.totalBalance += creditAmount;
        wallet.transactions.push({ type: "credit", amount: creditAmount, remark });
      }
      await wallet.save();
    } else if (adminDecision === "Reject") {
      item.status = "Return Rejected";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    // ✅ REPLACE updateOrderStatus(order) with this logic:
    const hasPendingItems = order.orderitems.some(oi => 
      ['Return Request', 'Cancel Request'].includes(oi.status)
    );
    const hasReturnedItems = order.orderitems.some(oi => oi.status === 'Returned');
    const allReturned = order.orderitems.every(oi => oi.status === 'Returned');

    if (allReturned) {
      order.orderStatus = 'Returned';
    } else if (hasReturnedItems) {
      order.orderStatus = 'Partially Returned';
    } else if (hasPendingItems) {
      order.orderStatus = 'Return Request';
    }

    await order.save();

    return res.status(200).json({ 
      success: `Return ${adminDecision.toLowerCase()}ed successfully`,
      acceptedQty 
    });
  } catch (error) {
    console.error("returnChoesingPost error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};







module.exports = {
  orderMangementPageLoad,
  orderdetailsPageload,
  updateOrderStatus,
  returnChoesingPost,

};
