const express = require("express")
const router = express.Router()

const walletController =require("../../controller/userController/wallet")

const userAuth = require("../../middilewears/usersession")

router.get("/wallet",walletController.walletPageLoad)
router.post("/addMoney",walletController.addMoney)
router.post("/verifyWalletPayment",walletController.verifyWalletPayment)



module.exports = router