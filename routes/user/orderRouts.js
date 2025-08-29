const express = require("express")
const router = express.Router()

const orderController = require("../../controller/userController/order")

const userAuth = require("../../middilewears/usersession")



router.get("/myorders",userAuth.check,orderController.myOdersPageLoad)
router.get("/orderdetails/:id",userAuth.check,orderController.orderDetailsPageLoad)
router.post("/orderorderDerailsPost",userAuth.check,orderController.orderDerailsPost)
router.post("/verifyrazorpay",orderController.verifyPayment)
router.post("/completerazorpay",orderController.completeRazorpayOrder)
router.post("/orderCancellation",userAuth.check,orderController.orderCancelletion)
router.post("/orderReturn",userAuth.check,orderController.orderReturn)


module.exports = router