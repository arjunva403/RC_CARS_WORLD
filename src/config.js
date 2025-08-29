const mongoose = require("mongoose")
const addressModel = require("../model/addresses")
const adminModel = require("../model/admin")
const brandModel = require("../model/brand")
const cartModel=require("../model/cart")
const categoryModel=require("../model/category")
const couponModel=require("../model/coupon")
const orderModel = require("../model/order")
const paymentsModel= require("../model/payments")
const productModel=require("../model/products")
const ratingAndReviewModel=require("../model/ratingAndReview")
const returnAndRefundModel=require("../model/returnAndRefund")
const usersModel=require("../model/users")
const walletModel=require("../model/wallet")
const wishlistModel=require("../model/wishlist")
const offerModle = require("../model/offers")
const categoryOffer = require("../model/categoryOffer")
const brandOffer = require("../model/brandOffer")

const connect = mongoose.connect("mongodb://localhost:27017/RCworld")
connect.then(()=>{console.log("mongo is connected")})
.catch(()=>{console.log("mongo is not connected")})

const schemasModel = {
    addressModel,
    brandModel,
    adminModel,
    cartModel,
    categoryModel,
    couponModel,
    orderModel,
    paymentsModel,
    productModel,
    ratingAndReviewModel,
    returnAndRefundModel,
    usersModel,
    walletModel,
    wishlistModel,
    offerModle,
    categoryOffer,
    brandOffer,
}

module.exports = schemasModel