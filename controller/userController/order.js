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
        } = req.body;
        
        const userId = req.session.user?._id;
        if (!userId) {
            return res.status(401).json({ failed: "User not logged in" });
        }

        
        if(paymentMethod === "razorpay") {
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
        const products = await model.productModel.findById({_id:productId}) 
        
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
        const products = await model.productModel.findById({_id:productId}) 
        
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
};

const orderCancelletion = async (req, res) => {
    try {
        const { selectedItemId, reason } = req.body;

        if (!selectedItemId || !reason) {
            return res.status(400).json({ message: "Missing item ID or reason" });
        }

        const order = await model.orderModel.findOne({ 'orderitems._id': selectedItemId });
        if (!order) {
            return res.status(404).json({ message: "Order item not found" });
        }

        const item = order.orderitems.id(selectedItemId);
        if (!item) {
            return res.status(404).json({ message: "Item not found in order" });
        }


        item.status = 'Cancelled';
        item.cancellationReason = reason;


        const allCancelled = order.orderitems.every(it => it.status === 'Cancelled');
        if (allCancelled) {
            order.orderStatus = 'Cancelled';
        } else {
            order.orderStatus = 'Partially Cancelled';
        }

        await order.save();
        res.status(200).json({ success: true, message: "Item cancelled successfully" });

    } catch (error) {
        console.error("Order cancel error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
};



const orderReturn = async (req, res) => {
    try {
        const { selectedItemId, reason } = req.body;
        
        
     
        const order = await model.orderModel.findOne({
            'orderitems._id': selectedItemId,
        });

        if (!order) {
            return res.status(404).json({ error: "Order item not found" });
        }

        const item = order.orderitems.id(selectedItemId);

        if (!item) {
            return res.status(404).json({ error: "Item not found in order" });
        }

        if (item.status !== 'Delivered') {
            return res.status(400).json({ error: "Only delivered items can be returned" });
        }


        item.status = 'Return Request';
        item.returnReason = reason;


        const allRequested = order.orderitems.every(it => it.status === 'Return Request');


        if (allRequested) {
            order.orderStatus = 'Return Request';
        } else {
            order.orderStatus = 'Partially Return Request';
        }

        await order.save();

        res.status(200).json({ success: "Item return requested successfully" });

    } catch (error) {
        console.error("Order return error:", error);
        res.status(500).json({ failed: "Server Error" });
    }
};







module.exports = {
    myOdersPageLoad,
    orderDetailsPageLoad,
    orderDerailsPost,
    verifyPayment,
    completeRazorpayOrder,
    orderCancelletion,
    orderReturn,
}