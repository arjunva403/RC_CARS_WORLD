const { render } = require("express-cookie/lib/response");
const model = require("../../src/config")
const helper = require("../../helpers/orderhelper")

const orderMangementPageLoad = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const search = req.query.search || '';
        const status = req.query.status || 'All Statuses';
        const sort = req.query.sort || 'Newest First';


        let query = {};


        if (search) {
            query = {
                $or: [
                    { orderId: { $regex: search, $options: 'i' } },
                    { 'userId.firstName': { $regex: search, $options: 'i' } },
                    { 'userId.email': { $regex: search, $options: 'i' } }
                ]
            };
        }


        if (status !== 'All Statuses') {
            query.orderStatus = status;
        }


        let sortOption = {};
        switch (sort) {
            case 'Oldest First':
                sortOption.createdAt = 1;
                break;
            case 'Amount: High to Low':
                sortOption.finalAmount = -1;
                break;
            case 'Amount: Low to High':
                sortOption.finalAmount = 1;
                break;
            default:
                sortOption.createdAt = -1;
        }


        const totalOrders = await model.orderModel.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);
        const orders = await model.orderModel
            .find(query)
            .populate("userId")
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(limit);

        res.render("admin/ordermanagement", {
            orders,
            currentPage: page,
            totalPages,
            totalOrders,
            search,
            status,
            sort
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
};

const orderdetailsPageload = async (req, res) => {
    try {
        const orderId = req.query.orderId;


        if (!orderId) {
            return res.status(400).send("Missing order ID");
        }

        const order = await model.orderModel.findById(orderId).populate("orderitems.productId");


        if (!order) {
            return res.status(404).send("Order not found");
        }
        let totalqty = 0
        order.orderitems.forEach(items => {
            totalqty += items.quantity
        });


        res.render("admin/orderdetails", { order, totalqty });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
}

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        if (!orderId || !status) {
            return res.status(400).json({ message: 'Order ID and status are required' });
        }

        const statusFlow = ['Pending', 'Ordered', 'Shipped', 'Delivered', 'Cancelled'];
        if (!statusFlow.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const order = await model.orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        let updateHappened = false;
        for (let item of order.orderitems) {
            if (item.status === 'Cancelled') {
                continue;
            }

            const currentIndex = statusFlow.indexOf(item.status);
            const newIndex = statusFlow.indexOf(status);

            if (newIndex > currentIndex) {
                item.status = status;
                updateHappened = true;
            } else if (newIndex === currentIndex) {
                continue;
            } else {
                return res.status(400).json({ message: `Cannot revert status of item '${item.productName}' from ${item.status} to ${status}` });
            }
        }


        if (updateHappened) {
            order.orderStatus = status;
            order.markModified('orderitems');
            await order.save();
            return res.status(200).json({ message: 'Order status updated successfully', order });
        } else {
            return res.status(200).json({ message: 'No updates applied. All items already in correct status.', order });
        }
    } catch (error) {
        console.error('Error updating order status:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};


const returnChoesingPost = async (req, res) => {
    try {
        const { value, itemId, orderId } = req.body;
        console.log(req.body)

        const order = await model.orderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const item = order.orderitems.id(itemId);
        if (!item) {
            return res.status(404).json({ message: "Item not found in order" });
        }
        const userId = order.userId

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
                    transactions: [{
                        type: "credit",
                        amount: creditAmount,
                        remark: `Return Accepted for product: ${item.productName || "Product"}`,
                    }],
                });
            } else {
                wallet.credited += creditAmount;
                wallet.totalBalance += creditAmount;
                wallet.transactions.push({
                    type: "credit",
                    amount: creditAmount,
                    remark: `Return Accepted for product: ${item.productName || "Product"}`,
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
        console.error("Return choice error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


const cancellationChoesingPost = async (req, res) => {
    try {
        const { action, itemId, productName, orderId, cancellationReason, cancellationQty, adminDecision } = req.body;

        if (action == "reject") return res.status(200).json({ message: "Cancellation request rejected" });

        const cancellprocess = await helper.ApplyCancel(orderId, productName, itemId, cancellationQty)

        if (!cancellprocess.success) {
            return res.status(400).json({ message: cancellprocess.message });
        }

        return res.status(200).json({
            success: true,
            message: cancellprocess.message,
            updatedOrder: cancellprocess.updatedOrder,
            walletRefunded: cancellprocess.walletRefunded
        });




    } catch (error) {
        console.error("Return choice error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};






module.exports = {
    orderMangementPageLoad,
    orderdetailsPageload,
    updateOrderStatus,
    returnChoesingPost,
    cancellationChoesingPost,
}