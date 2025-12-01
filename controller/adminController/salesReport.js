const model = require("../../src/config");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const moment = require('moment');

const buildFilter = (query) => {
    const { startDate, endDate, category, status, search } = query;
    const filter = {};

    if (startDate || endDate) {
        filter.createdOn = {};
        if (startDate) filter.createdOn.$gte = new Date(startDate);
        if (endDate) filter.createdOn.$lte = new Date(endDate);
    }

    if (category) {

        filter["orderitems.productId.categoryId.categoryName"] = category;
    }

    if (status && status !== "") {
        filter.orderStatus = status;
    }

    if (search && search.trim() !== "") {
        const searchRegex = new RegExp(search.trim(), "i");
        const maybeNumber = Number(search);
        const orConditions = [
            { "orderitems.productId.productName": searchRegex },
            { "userId.firstName": searchRegex },
        ];

        if (!Number.isNaN(maybeNumber)) {
            orConditions.push({ orderId: maybeNumber });
        }
        filter.$or = orConditions;
    }

    return filter;
};

const salesReportPageLoad = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = 2;
        const filter = buildFilter(req.query);
        const Order = model.orderModel;

        if (!Order) {
            console.error("orderModel not found in model.");
            return res.status(500).send("Server Error");
        }


        const totalSalesResult = await Order.aggregate([
            { $group: { _id: null, totalSales: { $sum: "$finalAmount" } } },
        ]);
        const totalSales = totalSalesResult[0]?.totalSales || 0;

        const allOrdersCount = await Order.countDocuments();

        const totalRevenueResult = await Order.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: "$finalAmount" } } },
        ]);
        const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

        const skip = (page - 1) * limit;

        const [orders, totalOrders] = await Promise.all([
            Order.find(filter)
                .populate("userId")
                .populate({ path: "orderitems.productId", populate: ["categoryId", "brandId"] })
                .sort({ createdOn: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(totalOrders / limit);
        const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        res.render("admin/salesReport", {
            orders,
            currentPage: page,
            totalPages,
            totalOrders,
            filters: req.query,
            totalSales,
            allorders: allOrdersCount,
            totalRevenue,
            averageOrder,
        });
    } catch (error) {
        console.error("Sales report error:", error);
        res.status(500).send("Server Error");
    }
};

const exportSalesToExcel = async (req, res) => {
    try {
        const filter = buildFilter(req.query);

        const orders = await model.orderModel
            .find(filter)
            .populate("userId")
            .populate({ path: "orderitems.productId", populate: ["categoryId", "brandId"] });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Sales Report");

        sheet.columns = [
            { header: "Order ID", key: "orderId", width: 15 },
            { header: "Product Name", key: "productName", width: 30 },
            { header: "Category", key: "category", width: 20 },
            { header: "Brand", key: "brand", width: 20 },
            { header: "Price", key: "price", width: 10 },
            { header: "Quantity", key: "quantity", width: 10 },
            { header: "Status", key: "status", width: 15 },
            { header: "Customer", key: "customer", width: 25 },
            { header: "Date", key: "date", width: 15 },
        ];

        orders.forEach((order) => {
            order.orderitems.forEach((item) => {
                sheet.addRow({
                    orderId: order.orderId,
                    productName: item.productId?.productName || "",
                    category: item.productId?.categoryId?.categoryName || "",
                    brand: item.productId?.brandId?.brandName || "",
                    price: item.price,
                    quantity: item.quantity,
                    status: item.status,
                    customer: order.userId?.firstName || "",
                    date: order.createdOn.toLocaleDateString("en-IN"),
                });
            });
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Excel export error:", error);
        res.status(500).send("Server error while exporting Excel");
    }
};

const exportSalesToPDF = async (req, res) => {
    try {
        const filter = buildFilter(req.query);

        const orders = await model.orderModel
            .find(filter)
            .populate("userId")
            .populate({ path: "orderitems.productId", populate: ["categoryId", "brandId"] });

        const doc = new PDFDocument({ margin: 30, size: "A4" });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');

        doc.pipe(res);
        doc.fontSize(18).text("Sales Report", { align: "center" });
        doc.moveDown();

        orders.forEach((order) => {
            order.orderitems.forEach((item) => {
                doc.fontSize(12).text(`Order ID: ${order.orderId}`);
                doc.text(`Product: ${item.productId?.productName || "N/A"}`);
                doc.text(`Category: ${item.productId?.categoryId?.categoryName || "N/A"}`);
                doc.text(`Brand: ${item.productId?.brandId?.brandName || "N/A"}`);
                doc.text(`Price: ₹${item.price}`);
                doc.text(`Quantity: ${item.quantity}`);
                doc.text(`Status: ${item.status}`);
                doc.text(`Customer: ${order.userId?.firstName || "N/A"}`);
                doc.text(`Date: ${order.createdOn.toLocaleDateString("en-IN")}`);
                doc.moveDown();
            });
        });

        doc.end();
    } catch (error) {
        console.error("PDF export error:", error);
        res.status(500).send("Server error while exporting PDF");
    }
};

const graphScale = async (req, res) => {
    try {
        const period = req.query.period || 'monthly';
        const filter = buildFilter(req.query);
        const Order = model.orderModel;

        let groupId = null;
        let labels = [];
        let salesData = [];
        let ordersData = [];

        if (!Order) {
            return res.status(500).json({ error: 'Order model not available' });
        }


        if (period === 'daily') {

            groupId = { dayOfWeek: { $dayOfWeek: "$createdOn" } };
        } else if (period === 'weekly') {

            groupId = {
                year: { $isoWeekYear: "$createdOn" },
                week: { $isoWeek: "$createdOn" }
            };
        } else {

            groupId = {
                year: { $year: "$createdOn" },
                month: { $month: "$createdOn" }
            };
        }


        const aggPipeline = [
            { $match: filter },
            {
                $group: {
                    _id: groupId,
                    totalSales: { $sum: "$finalAmount" },
                    ordersCount: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.dayOfWeek": 1 } }
        ];

        const aggResult = await Order.aggregate(aggPipeline);


        if (period === 'daily') {

            const dayMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

            salesData = Array(7).fill(0);
            ordersData = Array(7).fill(0);

            aggResult.forEach(item => {

                let idx = item._id.dayOfWeek - 2;
                if (idx < 0) idx = 6;
                salesData[idx] = item.totalSales;
                ordersData[idx] = item.ordersCount;
            });
        } else if (period === 'weekly') {
            labels = aggResult.map(item => `Week ${item._id.week}, ${item._id.year}`);
            salesData = aggResult.map(item => item.totalSales);
            ordersData = aggResult.map(item => item.ordersCount);
        } else {

            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            labels = aggResult.map(item => `${monthNames[item._id.month - 1]} ${item._id.year}`);
            salesData = aggResult.map(item => item.totalSales);
            ordersData = aggResult.map(item => item.ordersCount);
        }

        res.json({ labels, salesData, ordersData });
    } catch (error) {
        console.error('Failed to get sales data aggregation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
module.exports = {
    salesReportPageLoad,
    exportSalesToExcel,
    exportSalesToPDF,
    graphScale,
};
