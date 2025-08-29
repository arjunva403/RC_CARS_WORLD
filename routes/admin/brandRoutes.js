const express = require("express");
const router = express.Router();
const brandController = require("../../controller/adminController/brand");
const adminAuth=require("../../middilewears/adminsession")

router.get("/brands",adminAuth.check, brandController.brandPageLoad);
router.post("/addAndedit", brandController.addbrandAndeditPageLoad);
router.post("/brandlist/:brandId", brandController.listAndUnlistedPageLoad);

module.exports = router;