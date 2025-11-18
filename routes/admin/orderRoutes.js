const express = require("express");
const router = express.Router();
const orderController =require("../../controller/adminController/order")
const adminAuth=require("../../middilewears/adminsession")



router.get("/order",adminAuth.check,orderController.orderMangementPageLoad)
router.get("/orderdetails",adminAuth.check,orderController.orderdetailsPageload)
router.post("/updateStatus",orderController.updateOrderStatus)
router.post("/returnStatus",orderController.returnChoesingPost)
router.post("/cancellationStatus",orderController.cancellationChoesingPost)


module.exports = router;