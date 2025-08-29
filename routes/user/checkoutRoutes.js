const express = require("express")
const router = express.Router()
const checkoutController=require("../../controller/userController/checkout")

const userAuth = require("../../middilewears/usersession")


router.get("/checkout",userAuth.check,checkoutController.checkOutPageLoad)
router.post("/applycoupen",checkoutController.applycoupen)
router.post("/removeaddresscheckout",checkoutController.removeAddressfromcheckout)


module.exports = router