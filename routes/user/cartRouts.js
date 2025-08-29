const express = require("express")
const router = express.Router()

const cartController=require("../../controller/userController/cart")

const userAuth = require("../../middilewears/usersession")

router.get("/cart",userAuth.check,cartController.cartLoadPage)
router.post("/postcart",userAuth.check,cartController.PostCart)
router.post("/qtyupdate",userAuth.check,cartController.qtyUpdate)
router.post("/removecartitem",cartController.removeCartItems)

module.exports = router
