const express = require("express");
const router = express.Router();
const adminController = require("../../controller/adminController/admin");
const adminAuth=require("../../middilewears/adminsession")


router.get("/admin",adminAuth.is_login, adminController.adminLoginPageLoad);
router.post("/adminverifylogin", adminController.verifyAdminLoginPageLoad);
router.get("/dashboard",adminAuth.check,adminController.adminDashBoardPageLoad);
router.get("/usermange",adminAuth.check,adminController.userManagePageLoad);
router.post("/edituser/:userId", adminController.userManageEdit);


router.get("/logout",adminController.logout);

module.exports = router;