const express = require("express");
const router = express.Router();
const salesController = require("../../controller/adminController/salesReport")
const middilewears = require("../../middilewears/adminsession")

router.get("/saleReport",salesController.salesReportPageLoad)
router.get('/saleReport/export/excel',salesController.exportSalesToExcel);
router.get('/saleReport/export/pdf',salesController.exportSalesToPDF);
router.get("/api/sales-data",salesController.graphScale)

module.exports = router

