const express = require("express")
const nocache = require('nocache');
const app = express()
const session = require("express-session")
//userrouters
const userRouter = require("../routes/user/userRoutes")
const userproductRouter  = require("../routes/user/productRouts")
const useraddressRouter = require("../routes/user/AddressRoutes")
const usercartRouter = require("../routes/user/cartRouts")
const usercheckoutRouter = require("../routes/user/checkoutRoutes")
const userorderRouter = require("../routes/user/orderRouts")
const userwalletRouter = require("../routes/user/walletRouts")
const userwhishlistRouter = require("../routes/user/wishlistRouts")
//adminrouters
const adminRouter = require("../routes/admin/AdminRoutes")
const AdminbrandRouter = require("../routes/admin/brandRoutes")
const AdmincatagoryRouter = require("../routes/admin/catagoryRoutes")
const AdminorderRouter = require("../routes/admin/orderRoutes")
const AdminproductRouter = require("../routes/admin/productRoutes")
const AdminOfferRouter =require("../routes/admin/offerRoutes")
const AdminCoupenRouter = require("../routes/admin/coupenRoutes")
const AdminSalesReportRouter = require("../routes/admin/salesReportRoutes")

const confing = require("./config")
const passport = require("./passport")
require('dotenv').config();
const PORT = 4003


app.use(nocache())
app.use(express.static("public"))
app.use(express.json())
app.use(express.urlencoded({extends:true}))
app.set("view engine","ejs")
app.use(session({
    secret: "Rcworld",
    resave: false,
    saveUninitialized: true,
 }))

 app.use(passport.initialize())
 app.use(passport.session())

//user
app.use("/",userRouter,userproductRouter,useraddressRouter,usercartRouter,usercheckoutRouter,userorderRouter,userwalletRouter,userwhishlistRouter)
//admin
app.use("/",adminRouter,AdminbrandRouter,AdmincatagoryRouter,AdminorderRouter,AdminproductRouter,AdminOfferRouter,AdminCoupenRouter,AdminSalesReportRouter)


app.listen(PORT,()=>{console.log(`server is runnig on http://localhost:${PORT}`)})