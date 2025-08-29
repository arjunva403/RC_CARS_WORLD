const express = require("express");
const router = express.Router();

const productController = require("../../controller/adminController/poduct");
const upload = require("../../middilewears/multer");
const adminAuth=require("../../middilewears/adminsession")


router.get("/products", adminAuth.check,productController.productManagePageLoad);
router.get("/addproduct",adminAuth.check, productController.addProductPageLoad);
router.post("/addproduct", upload, productController.addProduct);
router.get("/editproduct/:id", adminAuth.check, productController.editProductPageLoad);
router.post("/editproduct/:id", upload, productController.editProduct);
router.post("/islist/:id",productController.islistPageLoad)
router.post("/deleteproduct/:id", productController.deleteProduct);

module.exports = router;