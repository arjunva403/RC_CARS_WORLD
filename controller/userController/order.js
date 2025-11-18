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

        res.render("user/OrderDetails", { order: orderdetails });
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
            couponName
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
            couponApplied: discount > 0,
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
            couponApplied: discount > 0,
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

        console.log('Return request body:', req.body);
        const order = await model.orderModel.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (!reason || reason.length < 10) {
            return res.json({ success: false, message: "Please provide a detailed reason (min 10 characters)" });
        }

        if (type === 'bulk') {
            // Handle bulk return for all items
            order.orderitems.forEach(item => {
                const availableToReturn = item.quantity - (item.cancelledQuantity || 0) - (item.returnedQuantity || 0);
                item.returnedQuantity = (item.returnedQuantity || 0) + availableToReturn;
                item.returnReason = reason;
                
                // Update status based on quantities
                const totalQty = item.quantity;
                const cancelledQty = item.cancelledQuantity || 0;
                const returnedQty = item.returnedQuantity || 0;
                
                if (returnedQty === totalQty) {
                    item.status = "returned";
                } else if (cancelledQty === totalQty) {
                    item.status = "cancelled";
                } else if (cancelledQty > 0 && returnedQty > 0) {
                    item.status = "mixed";
                } else if (returnedQty > 0) {
                    item.status = "partially returned";
                } else if (cancelledQty > 0) {
                    item.status = "partially cancelled";
                }
            });
            
            order.orderStatus = "returned";
            await order.save();
            return res.json({ success: true, message: "All items returned successfully", order });
        }

        // ✅ Find specific orderitem using auto-generated _id
        const item = order.orderitems.find(item => item._id.toString() === itemId);
        if (!item) return res.status(404).json({ success: false, message: "Order item not found" });

        // ✅ Validate return quantity
        const requestedReturn = parseInt(returnQuantity) || 1;
        const currentCancelled = item.cancelledQuantity || 0; 
        const currentReturned = item.returnedQuantity || 0;
        const availableToReturn = item.quantity - currentCancelled - currentReturned;
        
        if (requestedReturn <= 0) {
            return res.status(400).json({ success: false, message: "Return quantity must be at least 1" });
        }
        
        if (requestedReturn > availableToReturn) {
            return res.status(400).json({ 
                success: false, 
                message: `Can only return ${availableToReturn} items. ${currentReturned} already returned, ${currentCancelled} cancelled.` 
            });
        }

        // ✅ Update return quantity
        item.returnedQuantity = currentReturned + requestedReturn;
        item.returnReason = reason;

        // ✅ Smart status calculation
        const totalQuantity = item.quantity;
        const cancelledQty = item.cancelledQuantity || 0;
        const returnedQty = item.returnedQuantity || 0;
        const activeQty = totalQuantity - cancelledQty - returnedQty;

        if (returnedQty === totalQuantity) {
            item.status = "returned";
        } else if (cancelledQty === totalQuantity) {
            item.status = "cancelled";
        } else if (cancelledQty > 0 && returnedQty > 0) {
            item.status = "mixed";
        } else if (returnedQty > 0) {
            item.status = "partially returned";
        } else if (cancelledQty > 0) {
            item.status = "partially cancelled";
        }

        // ✅ Update overall order status
        const itemStatuses = order.orderitems.map(it => it.status);
        const hasReturned = itemStatuses.some(s => s.includes("return"));
        const hasCancelled = itemStatuses.some(s => s.includes("cancel"));
        const allReturned = order.orderitems.every(it => it.status === "returned");
        const allCancelled = order.orderitems.every(it => it.status === "cancelled");

        if (allReturned) {
            order.orderStatus = "returned";
        } else if (allCancelled) {
            order.orderStatus = "cancelled";
        } else if (hasReturned && hasCancelled) {
            order.orderStatus = "mixed";
        } else if (hasReturned) {
            order.orderStatus = "partially returned";
        } else if (hasCancelled) {
            order.orderStatus = "partially cancelled";
        }

        await order.save();

        return res.json({
            success: true,
            message: `${requestedReturn} item(s) returned successfully`,
            itemDetails: {
                itemId: item._id,
                productId: item.productId,
                cancelled: cancelledQty,
                returned: returnedQty,
                active: activeQty,
                total: totalQuantity,
                status: item.status
            },
            order
        });

    } catch (error) {
        console.error("Order return error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};



const orderCancellation = async (req, res) => {
    try {
        const { orderId, itemId, cancelQuantity, reason, type } = req.body;
        
    
        const order = await model.orderModel.findById(orderId);
        
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (!reason || reason.length < 10) {
            return res.json({ success: false, message: "Please provide a detailed reason (min 10 characters)" });
        }

        if (type === 'bulk') {
            // Handle bulk cancellation
            order.orderitems.forEach(item => {
                const availableToCancel = item.quantity - (item.cancelledQuantity || 0) - (item.returnedQuantity || 0);
                item.cancelledQuantity = (item.cancelledQuantity || 0) + availableToCancel;
                item.cancellationReason = reason;
                
                // Update status based on quantities
                const totalQty = item.quantity;
                const cancelledQty = item.cancelledQuantity || 0;
                const returnedQty = item.returnedQuantity || 0;
                
                if (cancelledQty === totalQty) {
                    item.status = "cancelled";
                } else if (returnedQty === totalQty) {
                    item.status = "returned";
                } else if (cancelledQty > 0 && returnedQty > 0) {
                    item.status = "mixed";
                } else if (cancelledQty > 0) {
                    item.status = "partially cancelled";
                } else if (returnedQty > 0) {
                    item.status = "partially returned";
                }
            });
            
            order.orderStatus = "partially cancelled";
            await order.save();
            return res.json({ success: true, message: "All items cancelled successfully", order });
        }

        // ✅ Find specific orderitem using auto-generated _id
        const item = order.orderitems.find(item => item._id.toString() === itemId);
        if (!item) return res.status(404).json({ success: false, message: "Order item not found" });

        // ✅ Validate cancel quantity
        const requestedCancel = parseInt(cancelQuantity) || 1;
        const currentCancelled = item.cancelledQuantity || 0;
        const currentReturned = item.returnedQuantity || 0;
        const availableToCancel = item.quantity - currentCancelled - currentReturned;
        
        if (requestedCancel <= 0) {
            return res.status(400).json({ success: false, message: "Cancel quantity must be at least 1" });
        }
        
        if (requestedCancel > availableToCancel) {
            return res.status(400).json({ 
                success: false, 
                message: `Can only cancel ${availableToCancel} items. ${currentCancelled} already cancelled, ${currentReturned} returned.` 
            });
        }

        // ✅ Update cancel quantity
        item.cancelledQuantity = currentCancelled + requestedCancel;
        item.cancellationReason = reason;

        // ✅ Smart status calculation
        const totalQuantity = item.quantity;
        const cancelledQty = item.cancelledQuantity || 0;
        const returnedQty = item.returnedQuantity || 0;
        const activeQty = totalQuantity - cancelledQty - returnedQty;

        if (cancelledQty === totalQuantity) {
            item.status = "cancelled";
        } else if (returnedQty === totalQuantity) {
            item.status = "returned";
        } else if (cancelledQty > 0 && returnedQty > 0) {
            item.status = "mixed";
        } else if (cancelledQty > 0) {
            item.status = "partially cancelled";
        } else if (returnedQty > 0) {
            item.status = "partially returned";
        }

        // ✅ Update overall order status
        const itemStatuses = order.orderitems.map(it => it.status);
        const hasReturned = itemStatuses.some(s => s.includes("return"));
        const hasCancelled = itemStatuses.some(s => s.includes("cancel"));
        const allReturned = order.orderitems.every(it => it.status === "returned");
        const allCancelled = order.orderitems.every(it => it.status === "cancelled");

        if (allCancelled) {
            order.orderStatus = "cancelled";
        } else if (allReturned) {
            order.orderStatus = "returned";
        } else if (hasReturned && hasCancelled) {
            order.orderStatus = "mixed";
        } else if (hasCancelled) {
            order.orderStatus = "partially cancelled";
        } else if (hasReturned) {
            order.orderStatus = "partially returned";
        }

        await order.save();

        return res.json({
            success: true,
            message: `${requestedCancel} item(s) cancelled successfully`,
            itemDetails: {
                itemId: item._id,
                productId: item.productId,
                cancelled: cancelledQty,
                returned: returnedQty,
                active: activeQty,
                total: totalQuantity,
                status: item.status
            },
            order
        });

    } catch (error) {
        console.error("Order cancellation error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};







module.exports = {
    myOdersPageLoad,
    orderDetailsPageLoad,
    orderDerailsPost,
    verifyPayment,
    completeRazorpayOrder,
    orderCancellation,
    orderReturn,
}