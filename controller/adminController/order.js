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

    const statusFlow = ["Pending", "Ordered", "Shipped", "Delivered", "Cancelled"];
    if (!statusFlow.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await model.orderModel.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    let updateHappened = false;
    for (let item of order.orderitems) {
      if (item.status === "Cancelled") continue; // Skip cancelled items
      const currentIndex = statusFlow.indexOf(item.status);
      const newIndex = statusFlow.indexOf(status);

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
      order.markModified("orderitems");
      await order.save();
      return res.status(200).json({ message: "Order status updated successfully", order });
    }
    return res.status(200).json({ message: "No updates applied. All items already in correct status.", order });
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const returnChoesingPost = async (req, res) => {
  try {
    const { value, itemId, orderId } = req.body;
    if (!value || !itemId || !orderId) return res.status(400).json({ message: "Missing required fields" });

    const order = await model.orderModel.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const item = order.orderitems.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found in order" });

    const userId = order.userId;

    if (value === "Accept") {
      item.status = "Return Accepted";

      let wallet = await model.walletModel.findOne({ customerId: userId });
      const creditAmount = item.price || 0;

      if (!wallet) {
        wallet = new model.walletModel({
          customerId: userId,
          credited: creditAmount,
          debited: 0,
          totalBalance: creditAmount,
          transactions: [
            {
              type: "credit",
              amount: creditAmount,
              remark: `Return Accepted for product: ${item.productId?.productName || "Product"}`,
            },
          ],
        });
      } else {
        wallet.credited += creditAmount;
        wallet.totalBalance += creditAmount;
        wallet.transactions.push({
          type: "credit",
          amount: creditAmount,
          remark: `Return Accepted for product: ${item.productId?.productName || "Product"}`,
        });
      }
      await wallet.save();
    } else if (value === "Reject") {
      item.status = "Return Rejected";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await order.save();
    return res.status(200).json({ message: `Return ${value.toLowerCase()}ed successfully` });
  } catch (error) {
    console.error("returnChoesingPost error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const cancellationChoesingPost = async (req, res) => {
  try {
    const { action, itemId, productName, orderId, cancellationReason, cancellationQty } = req.body;
    if (!action || !orderId || !itemId) return res.status(400).json({ message: "Missing required fields" });

    if (action === "reject") {
      return res.status(200).json({ message: "Cancellation request rejected" });
    }

    const cancellprocess = await helper.ApplyCancel(orderId, productName, itemId, cancellationQty);

    if (!cancellprocess.success) {
      return res.status(400).json({ message: cancellprocess.message });
    }

    return res.status(200).json({
      success: true,
      message: cancellprocess.message,
      updatedOrder: cancellprocess.updatedOrder,
      walletRefunded: cancellprocess.walletRefunded,
    });
  } catch (error) {
    console.error("cancellationChoesingPost error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  orderMangementPageLoad,
  orderdetailsPageload,
  updateOrderStatus,
  returnChoesingPost,
  cancellationChoesingPost,
};
