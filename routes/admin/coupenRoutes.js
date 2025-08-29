const express = require("express");
const router = express.Router();
const coupenController = require("../../controller/adminController/coupen")
const adminAuth=require("../../middilewears/adminsession")

router.get("/coupen",adminAuth.check,coupenController.coupenPageLoad)
router.post("/addcoupen",coupenController.addCouponPost)
router.get("/get-coupon/:id",coupenController.getUpdateData)
router.post("/updatecoupen/:id",coupenController.updateCoupen)
router.delete("/deleteCoupen/:id",coupenController.deleteCoupen)
module.exports = router;