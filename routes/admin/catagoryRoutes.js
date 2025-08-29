const express = require("express");
const router = express.Router();
const catagoryController = require("../../controller/adminController/categary");
const adminAuth=require("../../middilewears/adminsession")


router.get("/category", adminAuth.check,catagoryController.categoryPageLoad);
router.post("/postcategory",catagoryController.postcategoryPageLoad);
router.post("/list/:categoryid", catagoryController.listAndUnlistPageload);
router.post("/edit", catagoryController.editcategoryPageLoad);

module.exports = router;