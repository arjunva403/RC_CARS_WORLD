const model = require("../../src/config")
const razorpay = require('../../src/rezorpay');
const crypto = require("crypto");

const myOdersPageLoad = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        const orders = await model.orderModel
            .find({ userId })
            .populate("orderitems.productId")
            .sort({ createdAt: -1 });

        res.render("user/orders", { orders });
    } catch (error) {
        console.error("Error loading orders:", error);
        res.status(500).send("Server Error");
    }
};



const orderDetailsPageLoad = async (req, res) => {
    try {
        const orderId = req.params.id;

        const orderdetails = await model.orderModel
            .findOne({ _id: orderId })
            .populate("orderitems.productId");

        if (!orderdetails) {
            return res.status(404).send("Order not found");
        }
       
        const couponApplied = orderdetails?.couponApplied;

        res.render("user/OrderDetails", { order: orderdetails,couponApplied });
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
            paymentStatus: paymentMethod === "COD" ? "pending" : "paid",
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
            couponApplied:couponBoolen,
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
      return res.status(400).json({ success: false, message: "Please provide a detailed reason (min 10 characters)" });
    }

    const order = await model.orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (type === 'bulk') {
      order.orderitems.forEach(item => {
        const availableToReturn = item.quantity - (item.cancelledQuantity || 0) - (item.returnedQuantity || 0);
        if (availableToReturn > 0) {
          item.returnedQuantity = (item.returnedQuantity || 0) + availableToReturn;
          item.returnReason = reason;
          updateItemStatus(item);
        }
      });

      order.orderStatus = "Returned";
      await order.save();
      return res.json({ success: true, message: "All items returned successfully", order });
    }

    const item = order.orderitems.find(i => i._id.toString() === itemId);
    if (!item) return res.status(404).json({ success: false, message: "Order item not found" });

    const qty = parseInt(returnQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: "Return quantity must be a positive integer" });
    }

    const availableToReturn = item.quantity - (item.cancelledQuantity || 0) - (item.returnedQuantity || 0);

    if (qty > availableToReturn) {
      return res.status(400).json({ success: false, message: `Can only return ${availableToReturn} item(s).` });
    }

    item.returnedQuantity = (item.returnedQuantity || 0) + qty;
    item.returnReason = reason;
    updateItemStatus(item);

    updateOrderStatus(order);

    await order.save();

    return res.json({
      success: true,
      message: `${qty} item(s) returned successfully`,
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

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ success: false, message: "Please provide a detailed reason (min 10 characters)" });
    }

    const order = await model.orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (type === 'bulk') {
      order.orderitems.forEach(item => {
        const availableToCancel = item.quantity - (item.cancelledQuantity || 0) - (item.returnedQuantity || 0);
        if (availableToCancel > 0) {
          item.cancelledQuantity = (item.cancelledQuantity || 0) + availableToCancel;
          item.cancellationReason = reason;
          updateItemStatus(item);
        }
      });
      order.orderStatus = "Partially Cancelled";
      await order.save();
      return res.json({ success: true, message: "All items cancelled successfully", order });
    }

    const item = order.orderitems.find(i => i._id.toString() === itemId);
    if (!item) return res.status(404).json({ success: false, message: "Order item not found" });

    const qty = parseInt(cancelQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: "Cancel quantity must be a positive integer" });
    }

    const availableToCancel = item.quantity - (item.cancelledQuantity || 0) - (item.returnedQuantity || 0);

    if (qty > availableToCancel) {
      return res.status(400).json({ success: false, message: `Can only cancel ${availableToCancel} item(s).` });
    }

    item.cancelledQuantity = (item.cancelledQuantity || 0) + qty;
    item.cancellationReason = reason;
    updateItemStatus(item);

    updateOrderStatus(order);

    await order.save();

    return res.json({
      success: true,
      message: `${qty} item(s) cancelled successfully`,
      itemDetails: item,
      order
    });

  } catch (error) {
    console.error("Order cancellation error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Helper to update order item status based on quantities
function updateItemStatus(item) {
  const total = item.quantity;
  const cancelled = item.cancelledQuantity || 0;
  const returned = item.returnedQuantity || 0;

  if (cancelled === total) {
    item.status = "Cancelled";
  } else if (returned === total) {
    item.status = "Returned";
  } else if (cancelled > 0 && returned > 0) {
    item.status = "Mixed";
  } else if (cancelled > 0) {
    item.status = "Partially Cancelled";
  } else if (returned > 0) {
    item.status = "Partially Returned";
  } else {
    item.status = "Pending";
  }
}

// Helper to update overall order status based on all items
function updateOrderStatus(order) {
  const statuses = order.orderitems.map(it => it.status.toLowerCase());
  const allCancelled = statuses.every(s => s === "cancelled");
  const allReturned = statuses.every(s => s === "returned");
  const hasCancelled = statuses.some(s => s.includes("cancel"));
  const hasReturned = statuses.some(s => s.includes("return"));

  if (allCancelled) {
    order.orderStatus = "Cancelled";
  } else if (allReturned) {
    order.orderStatus = "Returned";
  } else if (hasCancelled && hasReturned) {
    order.orderStatus = "Mixed";
  } else if (hasCancelled) {
    order.orderStatus = "Partially Cancelled";
  } else if (hasReturned) {
    order.orderStatus = "Partially Returned";
  } else {
    order.orderStatus = "Pending";
  }
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