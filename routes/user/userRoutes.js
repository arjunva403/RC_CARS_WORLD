const express = require("express")
const router = express.Router()
const userController = require("../../controller/userController/user")
const userAuth = require("../../middilewears/usersession")
const passport = require("passport")
const { redirect } = require("express-cookie/lib/response")


router.get("/",userController.landingPageLoad)
router.get("/login",userAuth.is_login,userController.loginPageLoad)
router.post("/verifylogin",userController.verifyLoginPageLoad)
router.post("/verifyemail",userController.forgotEmailVerifyPageLoad)
router.get("/forgototp",userController.forgetpassOtpPageLoad)
router.get("/recoverpass",userController.recoverypassPageload)
router.post("/verifyrecoverypass",userController.recoveryPassVerifyPageLoad)
router.get("/register",userController.registerPageLoad)
router.post("/verifysign",userController.verifySignupPageLoad)
router.get("/signotp",userController.signupOtpPageLoad)
router.post("/resend",userController.resendOtp)
router.get("/profile",userAuth.check,userController.profilePageLoad)
router.post("/updateprofile/:id",userController.updatedProfilePageLoad)
router.get("/chengepass",userController.chengePasswordPageLoad)
router.get("/chengeEmail",userAuth.check,userController.changeEmailPageLoad)
router.get("/chengeEmailOTP",userAuth.check,userController.chengeEmailOTP)
router.get("/forgotemail",userController.recoveryemailPageload)
router.post("/verifysignotp",userController.verifySignOtpPageLoad)
router.post("/verifyforgotOtp",userController.verifyForgotOtpPageLoad)
router.post("/chengepass",userController.verifyChengepassword)
router.post("/chengeemail",userAuth.check,userController.ChengeEmail)
router.post("/veryfyemailOTP",userController.verifiyEmailOTP)
router.post("/chengeEmailResendOTP",userController.chengeEmailresendOtp)
router.get("/newEmailPage",userAuth.check,userController.newEmailPageLoad)
router.post("/newEmailVerify",userController.newEmailVeryfy)
router.get("/chengeEmailConfrim",userAuth.check,userController.chengeConfrimEmailOTP)
router.post("/chengeEmailConfrimVerify",userController.chengeConfrimEmailOTPverify)
router.post("/chengeConfrimEmailOTPverifyResendOTP",userController.chengeConfrimEmailOTPverifyResendOTP)

router.get("/auth/google",userAuth.is_login,passport.authenticate("google",{scope:['profile','email']}))
router.get("/auth/google/callback",passport.authenticate("google",{failureRedirect:"/login"}),userController.googleAuth)



router.get("/logout",userController.logout)


module.exports = router