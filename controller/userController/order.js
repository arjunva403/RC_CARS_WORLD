const model = require("../../src/config")
const razorpay = require('../../src/rezorpay');
const crypto = require("crypto");

const myOdersPageLoad = async (req, res) => {
  try {
   const userId = req.session.user?._id
    const users = await model.usersModel.findById({_id:userId})

    const page = parseInt(req.query.page, 10) || 1;   // current page
    const limit = 3;                                  // orders per page
    const skip = (page - 1) * limit;

    const filter = { userId };

    const [orders, totalOrders] = await Promise.all([
      model.orderModel
        .find(filter)
        .populate("orderitems.productId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      model.orderModel.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalOrders / limit));

    res.render("user/orders", {
      orders,
      currentPage: page,
      totalPages,
      totalOrders,
      users,
    });
  } catch (error) {
    console.error("Error loading orders:", error);
    res.status(500).send("Server Error");
  }
};




const orderDetailsPageLoad = async (req, res) => {
  try {
    const orderId = req.params.id;
       const userId = req.session.user?._id
    const users = await model.usersModel.findById({_id:userId})
    const orderdetails = await model.orderModel
      .findOne({ _id: orderId })
      .populate("orderitems.productId");

    if (!orderdetails) {
      return res.status(404).send("Order not found");
    }

    const couponApplied = orderdetails?.couponApplied;

    res.render("user/OrderDetails", { order: orderdetails, couponApplied,users });
  } catch (error) {
    console.error("Order details error:", error.message);
    res.status(500).send("Server Error");
  }
};

const orderDerailsPost = async (req, res) => {
  try {
    const {
      addressId,
      addressIndex,
      paymentMethod,
      Shipping,
      subtotal,
      totalitems,
      discount,
      total,
      productId,
      orderdperson,
      couponName,
      couponBoolen
    } = req.body;

    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ failed: "User not logged in" });
    }

    // 1) Razorpay flow (unchanged)
    if (paymentMethod === "razorpay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: total * 100,
        currency: "INR",
        receipt: `order_rcpt_${Date.now()}`
      });
      return res.json({
        key: process.env.RAZORPAY_KEY,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        success: "Razorpay order created"
      });
    }

    // 2) Wallet payment flow
    if (paymentMethod === "Wallet") {
      let wallet = await model.walletModel.findOne({ customerId: userId });
      if (!wallet) {
        return res.status(400).json({ failed: "Wallet not found" });
      }

      if (wallet.totalBalance < total) {
        return res.status(400).json({ failed: "Insufficient wallet balance" });
      }

      // Deduct from wallet
      wallet.debited += total;
      wallet.totalBalance -= total;

      wallet.transactions.push({
        type: "debit",
        amount: total,
        remark: "Order payment"
      });

      await wallet.save();
    }

    // 3) Address + cart validation (same as before)
    const useraddress = await model.addressModel.findById(addressId);
    if (!useraddress) return res.json({ failed: "Address not found" });

    const selectedAddress = useraddress.address[addressIndex];
    if (!selectedAddress) return res.json({ failed: "Selected address not found" });

    const userCart = await model.cartModel
      .findOne({ userId })
      .populate("items.productId");

    if (!userCart || userCart.items.length === 0) {
      return res.json({ failed: "Cart is empty" });
    }

    const orderItems = userCart.items.map(item => ({
      productId: item.productId._id,
      productName: item.productId.productName,
      productImage: item.productId.productImage,
      quantity: item.quantity,
      price: item.productId.discountPrice,
      discount: item.productId.basePrice - item.productId.discountPrice || 0,
      status: "Ordered",
      cancellationReason: "none",
      returnReason: "none"
    }));

    const quantity = userCart.items.reduce((totalQty, item) => totalQty + item.quantity, 0);

    const products = await model.productModel.findById({ _id: productId });
    const updatedStock = products.stock - quantity;
    await model.productModel.findByIdAndUpdate(productId, { stock: updatedStock });

    const orderId = Math.floor(100000 + Math.random() * 900000);

    const newOrder = {
      orderId,
      userId,
      orderitems: orderItems,
      totalPrice: subtotal,
      discount,
      finalAmount: total,
      couponName,
      shippingAddress: {
        addressType: selectedAddress.addressType,
        title: orderdperson,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        address: selectedAddress.houseNo + ", " + selectedAddress.locality,
        landmark: selectedAddress.landMark || "",
        phone: selectedAddress.phoneNumber,
        altPhone: selectedAddress.altPhoneNumber || "",
        email: selectedAddress.email || "default@email.com",
      },
      paymentMethod,
      paymentStatus:
        paymentMethod === "COD" ? "pending" : "paid", 
      invoiceDate: new Date(),
      couponApplied: couponBoolen,
    };

    const savedOrder = await model.orderModel.create(newOrder);
    await model.cartModel.deleteOne({ userId });

    return res.json({ success: "Order placed", orderId: savedOrder._id });
  } catch (error) {
    console.error("Order save error:", error);
    return res.status(500).json({ failed: "Server Error" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');
    if (generated_signature === razorpay_signature) {
      return res.json({ success: "Payment verified successfully" });
    } else {
      return res.status(400).json({ failed: "Invalid signature" });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ failed: "Server Error" });
  }
};
const completeRazorpayOrder = async (req, res) => {
  try {
    const {
      addressId,
      addressIndex,
      paymentMethod,
      Shipping,
      subtotal,
      totalitems,
      discount,
      total,
      productId,
      orderdperson,
      couponName,
      couponBoolen,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    } = req.body;

    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ failed: "User not logged in" });
    }
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest('hex');
    if (generated_signature !== razorpaySignature) {
      return res.status(400).json({ failed: "Invalid signature" });
    }
    const useraddress = await model.addressModel.findById(addressId);
    if (!useraddress) return res.json({ failed: "Address not found" });
    const selectedAddress = useraddress.address[addressIndex];
    if (!selectedAddress) return res.json({ failed: "Selected address not found" });
    const userCart = await model.cartModel
      .findOne({ userId })
      .populate("items.productId");
    if (!userCart || userCart.items.length === 0) {
      return res.json({ failed: "Cart is empty" });
    }
    const orderItems = userCart.items.map(item => ({
      productId: item.productId._id,
      productName: item.productId.productName,
      productImage: item.productId.productImage,
      quantity: item.quantity,
      price: item.productId.discountPrice,
      discount: item.productId.basePrice - item.productId.discountPrice || 0,
      status: "Ordered",
      cancellationReason: "none",
      returnReason: "none"
    }));
    const quantity = userCart.items.reduce((total, item) => total + item.quantity, 0);
    const products = await model.productModel.findById({ _id: productId })
    const updatedStock = products.stock - quantity
    await model.productModel.findByIdAndUpdate(productId, { stock: updatedStock });
    const orderId = Math.floor(100000 + Math.random() * 900000);
    const newOrder = {
      orderId,
      userId,
      orderitems: orderItems,
      totalPrice: subtotal,
      discount,
      finalAmount: total,
      couponName,
      shippingAddress: {
        addressType: selectedAddress.addressType,
        title: orderdperson,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        address: selectedAddress.houseNo + ", " + selectedAddress.locality,
        landmark: selectedAddress.landMark || "",
        phone: selectedAddress.phoneNumber,
        altPhone: selectedAddress.altPhoneNumber || "",
        email: selectedAddress.email || "default@email.com",
      },
      paymentMethod,
      paymentStatus: "paid",
      razorpayPaymentId,
      razorpayOrderId,
      invoiceDate: new Date(),
      couponApplied: couponBoolen,
    };
    const savedOrder = await model.orderModel.create(newOrder);
    await model.cartModel.deleteOne({ userId });
    res.json({ success: "Order placed", orderId: savedOrder._id });
  } catch (error) {
    console.error("Order save error:", error);
    res.status(500).json({ failed: "Server Error" });
  }
}


const orderReturn = async (req, res) => {
  try {
    const { orderId, itemId, returnQuantity, reason, type } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a detailed reason (min 10 characters)"
      });
    }

    const order = await model.orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }



    // BULK: only create requests, do not move quantities yet
    if (type === "bulk") {
      let anyUpdated = false;

      // debug: check items and type
      console.log("BULK RETURN for order:", orderId, "items length:", order.orderitems.length);

      for (const item of order.orderitems) {
        const availableToReturn =
          item.quantity - (item.cancelledQuantity || 0) - (item.returnedQuantity || 0);

        if (availableToReturn > 0) {
          item.returnReason = reason;
          item.returnedQuantity = (item.returnedQuantity || 0) + availableToReturn;
          item.status = "Return Request";
          anyUpdated = true;
        }
      }

      if (!anyUpdated) {
        return res.json({
          success: false,
          message: "No quantities left to return for any items",
          order
        });
      }

      updateOrderStatus(order);
      await order.save();

      return res.json({
        success: true,
        message: "Return request submitted for all eligible items",
        order
      });
    }


    const item = order.orderitems.find(i => i._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Order item not found" });
    }

    const qty = parseInt(returnQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Return quantity must be a positive integer"
      });
    }

    const availableToReturn =
      item.quantity - (item.cancelledQuantity || 0) - (item.returnedQuantity || 0);

    if (availableToReturn <= 0) {
      return res.status(400).json({
        success: false,
        message: "No quantity left to return for this item"
      });
    }

    if (qty > availableToReturn) {
      return res.status(400).json({
        success: false,
        message: `Can only return ${availableToReturn} item(s).`
      });
    }

    // Here we ONLY mark request, do not increase returnedQuantity
    item.returnReason = reason;
    item.returnedQuantity = parseInt(returnQuantity)
    item.status = "Return Request";

    updateOrderStatus(order);
    await order.save();

    return res.json({
      success: true,
      message: `Return request placed for ${qty} item(s)`,
      itemDetails: item,
      order
    });
  } catch (error) {
    console.error("Order return error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


const orderCancellation = async (req, res) => {
  try {
    const { orderId, itemId, cancelQuantity, reason, type } = req.body;

    // 1) Basic validation
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a detailed reason (min 10 characters)"
      });
    }

    const order = await model.orderModel.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Helper: refund to wallet
    const refundToWallet = async (userId, amount) => {
      if (!amount || amount <= 0) return;

      let wallet = await model.walletModel.findOne({ customerId: userId }); // use correct key

      if (!wallet) {
        wallet = new model.walletModel({
          customerId: userId,        
          balance: 0,
          transactions: []
        });
      }

      wallet.balance += amount;
      wallet.transactions.push({
        type: "credit",
        amount,
        description: "Order cancellation refund",
        remark : "Order Cancelled",
        createdAt: new Date()
      });

      await wallet.save();
    };


    let totalRefund = 0;

    // 2) BULK CANCELLATION (all possible quantities)
    if (type === "bulk") {
      let anyUpdated = false;

      for (const item of order.orderitems) {
        const alreadyCancelled = item.cancelledQuantity || 0;
        const alreadyReturned = item.returnedQuantity || 0;
        const availableToCancel = item.quantity - alreadyCancelled - alreadyReturned;

        if (availableToCancel > 0) {
          item.cancelledQuantity = alreadyCancelled + availableToCancel;
          item.cancellationReason = reason;
          item.status = "Cancelled";

          const refundForItem = availableToCancel * item.price;
          totalRefund += refundForItem;

          anyUpdated = true;
        }
      }

      if (!anyUpdated) {
        return res.json({
          success: false,
          message: "No quantities left to cancel for any items",
          order
        });
      }

      // refund once for all items
      await refundToWallet(order.userId, totalRefund);

      // update overall order status
      updateOrderStatus(order);
      await order.save();

      return res.json({
        success: true,
        message: "All possible quantities cancelled successfully",
        order
      });
    }

    // 3) SINGLE ITEM / PARTIAL CANCELLATION
    const item = order.orderitems.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found in order" });
    }

    const reqQty = parseInt(cancelQuantity, 10) || 0;
    if (reqQty <= 0) {
      return res.status(400).json({ success: false, message: "Invalid cancellation quantity" });
    }

    const alreadyCancelled = item.cancelledQuantity || 0;
    const alreadyReturned = item.returnedQuantity || 0;
    const availableToCancel = item.quantity - alreadyCancelled - alreadyReturned;

    if (availableToCancel <= 0) {
      return res.status(400).json({
        success: false,
        message: "No quantities left to cancel for this item"
      });
    }

    const finalCancelQty = Math.min(reqQty, availableToCancel);

    item.cancelledQuantity = alreadyCancelled + finalCancelQty;
    item.cancellationReason = reason;

    if (item.cancelledQuantity === item.quantity) {
      item.status = "Cancelled";
    } else {
      item.status = "Partially Cancelled";  // make sure this exists in your enum or adjust
    }

    const refundAmount = finalCancelQty * item.price;
    await refundToWallet(order.userId, refundAmount);

    updateOrderStatus(order);
    await order.save();

    return res.json({
      success: true,
      message: "Item cancelled successfully",
      order
    });

  } catch (error) {
    console.error("Order cancellation error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};


function updateItemStatus(item) {
  const total = item.quantity;
  const cancelled = item.cancelledQuantity || 0;
  const returned = item.returnedQuantity || 0;

  // Return status is controlled by admin, not user
  if (item.status === "Return Request") {
    return; // keep it as request
  } else if (cancelled === total && total > 0) {
    item.status = "Cancelled";
  } else if (cancelled > 0) {
    item.status = "Partially Cancelled";
  } else if (!item.status) {
    item.status = "Pending";
  }
}



function updateOrderStatus(order) {
  const statuses = order.orderitems.map(it => (it.status || "Pending").toLowerCase());

  const allCancelled = statuses.length > 0 && statuses.every(s => s === "cancelled");
  const allReturnRequests = statuses.length > 0 && statuses.every(s => s === "return request");
  const hasReturnRequests = statuses.some(s => s === "return request");
  const hasCancelled = statuses.some(s => s.includes("cancel"));
  const anyPendingOrOther = statuses.some(
    s => !["cancelled", "return request"].includes(s)
  );

  if (allCancelled) {
    order.orderStatus = "Cancelled";
  }
  else if (allReturnRequests) {
    // only requests created, nothing processed yet
    order.orderStatus = "Return Request";
  }
  else if (hasReturnRequests) {
    // some items requested, others still normal
    order.orderStatus = "Partially Return Request";
  }
  else if (hasCancelled) {
    order.orderStatus = anyPendingOrOther ? "Partially Cancelled" : "Cancelled";
  }
  else {
    order.orderStatus = "Pending";
  }

  order.orderStatusUpdatedAt = new Date();
}













module.exports = {
  myOdersPageLoad,
  orderDetailsPageLoad,
  orderDerailsPost,
  verifyPayment,
  completeRazorpayOrder,
  orderCancellation,
  orderReturn,
}