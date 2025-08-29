const express = require("express")
const router = express.Router()
const wishlistController = require("../../controller/userController/wishlist")

const userAuth = require("../../middilewears/usersession")


router.get("/wish",userAuth.check,wishlistController.wishlistPageLoad)
router.post("/addwish",wishlistController.Addwishlist)
router.post("/remove",wishlistController.removeFromWishlist)

module.exports = router