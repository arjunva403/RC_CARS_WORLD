const model = require("../../src/config")


const salesReportPageLoad = async (req, res) => {
    try {
        const orders = await model.orderModel
            .find()
            .populate({
                path: "orderitems.productId",
                populate: [{ path: "brandId" }, { path: "categoryId" }]
            })
            .populate("userId");

        res.render("admin/salesReport", { orders })
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
}



module.exports = {
    salesReportPageLoad
}