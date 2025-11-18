const model = require("../src/config");

const ApplyCancel = async (orderId, productName, itemId, cancellationQty) => {
    const orders = await model.orderModel.findById(orderId);
    if (!orders) return { success: false, message: "Order not found" };

    const activeItems = orders.orderitems.filter(item => item.status !== "cancelled");
    if (activeItems.length === 0) 
        return { success: false, message: "No items available for cancellation" };

    if (orders.couponApplied === true) {
        const coupon = await model.couponModel.findOne({ couponCode: orders.couponName });
        if (!coupon) return { success: false, message: "Coupon not found" };

        const coupenType = coupon.couponType;
        const coupenAmount = coupon.couponAmount;

        const couponItems = orders.orderitems.filter(item => item.quantity > 0);

        if (coupenType === "fixed") {
            const perItemDiscount = coupenAmount / couponItems.length;
            couponItems.forEach(item => {
                item.discount = perItemDiscount;
                item.finalPrice = (item.price * item.quantity) - perItemDiscount;
            });
        } else if (coupenType === "percentage") {
            couponItems.forEach(item => {
                const itemTotal = item.price * item.quantity;
                const discount = (itemTotal * coupenAmount) / 100;
                item.discount = discount;
                item.finalPrice = itemTotal - discount;
            });
        }
    }

    let refundAmount = 0;

    if (itemId && cancellationQty > 0) {
        orders.orderitems.forEach(item => {
            if (item._id.toString() === itemId) {
                const cancelQty = Math.min(parseInt(cancellationQty), item.quantity);
                const perUnitDiscount = (item.discount || 0) / (item.quantity || 1);
                const refundable = (item.price * cancelQty) - (perUnitDiscount * cancelQty);
                refundAmount += refundable;

                item.cancelledQuantity += cancelQty;
                item.quantity -= cancelQty;
                item.finalPrice = item.price * item.quantity;

                if (item.quantity <= 0) {
                    item.status = "cancelled";
                    item.finalPrice = 0;
                } else if (item.cancelledQuantity > 0) {
                    item.status = "partially cancelled";
                }
            }
        });

        let wallet = await model.walletModel.findOne({ customerId: orders.userId });
        if (!wallet) {
            wallet = await model.walletModel.create({
                customerId: orders.userId,
                credited: refundAmount,
                totalBalance: refundAmount,
                transactions: [{
                    type: "credit",
                    amount: refundAmount,
                    remark: `Refund for order ${orders.orderId} cancellation`
                }]
            });
        } else {
            wallet.credited += refundAmount;
            wallet.totalBalance += refundAmount;
            wallet.transactions.push({
                type: "credit",
                amount: refundAmount,
                remark: `Refund for order ${orders.orderId} cancellation`
            });
            await wallet.save();
        }
    }

    
    orders.totalPrice = orders.orderitems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    orders.discount = orders.orderitems.reduce((sum, item) => sum + (item.discount || 0), 0);
    orders.finalAmount = orders.totalPrice - orders.discount;

    
    await orders.save();

    return {
        success: true,
        message: "Order updated successfully",
        updatedOrder: orders,
        walletRefunded: refundAmount
    };
};

module.exports = { ApplyCancel };
