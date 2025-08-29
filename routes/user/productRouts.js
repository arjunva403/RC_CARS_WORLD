const express = require("express")
const router = express.Router()
const productController = require("../../controller/userController/product")

const userAuth = require("../../middilewears/usersession")

router.get("/product",productController.productLoadPage)
router.post("/product",productController.productPostPageLoad)

router.get("/details/:id",productController.productDetealsPageload)


module.exports = router