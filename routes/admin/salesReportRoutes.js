const express = require("express");
const router = express.Router();
const salesController = require("../../controller/adminController/salesReport")
const middilewears = require("../../middilewears/adminsession")

router.get("/saleReport",salesController.salesReportPageLoad)

module.exports = router

