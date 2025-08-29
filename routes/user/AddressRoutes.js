const express = require("express")
const router = express.Router()
const addressController = require("../../controller/userController/address")

const userAuth = require("../../middilewears/usersession")


router.get("/manageadd",userAuth.check,addressController.manageAddressPageLoad)
router.get("/addaddress",userAuth.check,addressController.addAddresspageLoad)
router.get("/editeaddress/:id",userAuth.check,addressController.editaddressPageLoad)
router.post("/addaddress",userAuth.check,addressController.addAddressPostMethord)
router.post("/postedit/:id",userAuth.check,addressController.posteditAddress)
router.get("/deleteaddress/:id",userAuth.check,addressController.deleteAddress)


module.exports = router