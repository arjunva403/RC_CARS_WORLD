const express = require("express");
const router = express.Router();
const offerController = require("../../controller/adminController/offer")
const adminAuth = require("../../middilewears/adminsession")

router.get("/offer",adminAuth.check,offerController.offerPageLoad)
router.post("/addoffer",offerController.offerPost)
router.post("/updateoffer/:id",offerController.updateOffer)
router.delete("/deleteOffer/:id",offerController.deleteOffer)
router.post("/addCategoryOffer",offerController.catagoryoffer)
router.post("/addBrandOffer",offerController.brandOffer)
router.post("/updateCategoryOffer/:id",offerController.updateCatagoryOffer)
router.post("/updateBrandOffer/:id",offerController.updateBrandOffer)
router.delete("/deleteCategoryOffer/:id",offerController.deleteCategoryOffer)
router.delete("/deleteBrandOffer/:id",offerController.deleteBrandOffer)

module.exports = router;
