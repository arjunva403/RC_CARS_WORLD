const nodemailer = require("nodemailer")
const model = require("../../src/config")
const bcrypt = require('bcrypt');
const users = require("../../model/users");
const { response } = require("express");
const { json } = require("express-cookie/lib/response");
require('dotenv').config();



const landingPageLoad = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id;
    let cartCount = 0;

    let userCart = null;

    if (userId) {
      userCart = await model.cartModel.findOne({ userId });

      if (userCart && userCart.items.length > 0) {
        cartCount = userCart.items.reduce((acc, item) => acc + item.quantity, 0);
      }
    }

    const productdata = await model.productModel.find();
    const newdata = await model.productModel.find().sort({ createdAt: -1 });

    res.render("user/home", {
      productdata,
      newdata,
      user,
      cartCount,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};


const forgetpassOtpPageLoad = async (req, res) => {
    try {
        res.render("user/forgetotp")
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}

const signupOtpPageLoad = async (req, res) => {
    try {
        const data = req.session.userdata

        res.render("user/signotp")
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}

const loginPageLoad = async (req, res) => {
    try {
        res.render("user/login")
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }

}

const recoveryemailPageload = async (req, res) => {
    try {
        res.render("user/recoveryemail")
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}
const recoverypassPageload = async (req, res) => {
    try {
        res.render("user/recoverypass")
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}
const registerPageLoad = async (req, res) => {
    try {
        res.render("user/register")
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}

const profilePageLoad = async (req, res) => {
    try {
        const user = req.session.user?._id
        const users = await model.usersModel.findById({_id:user})
        
        res.render("user/profile", { users })
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}



const chengePasswordPageLoad = async (req, res) => {
    try {

        res.render("user/chengepass")
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}


function generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

const verifySignupPageLoad = async (req, res) => {
    try {
        const otp = generateOTP();
        const data = {
            username: req.body.username,
            lastname: req.body.lastname,
            password: req.body.password,
            phoneNumber: req.body.phoneNumber,
            email: req.body.email,
            confirmPassword: req.body.confirmPassword,
            otp: otp
        }

        if (data.password !== data.confirmPassword) {
            return res.status(400).json({ msg: "password is not match" })
        }
        req.session.userdata = data
        console.log(`Generated OTP for ${data.email}: ${otp}`);
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: data.email,
            subject: "verify otp ",
            text: `your otp is ${otp}`
        });

        res.json({ msg: "it oky" })

        return info.accepted.length > 0;

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}
const resendOtp = async (req, res) => {
    try {

        const newOtp = generateOTP();
        if (req.session.userdata) {

            req.session.userdata.otp = newOtp;


            console.log("OTP resent:", newOtp);

            return res.json({ message: "OTP resent successfully" });
        } else {
            return res.status(400).json({ error: "User session not found" });
        }
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Server Error" });
    }
};

const verifySignOtpPageLoad = async (req, res) => {
    try {
        const { enterotp } = req.body;
        const userdata = req.session.userdata;

        if (!userdata || !userdata.otp) {
            return res.status(400).json({ error: "Session or OTP expired" });
        }

        const originalOtp = userdata.otp;
        console.log("OTP entered:", enterotp, "| OTP stored:", originalOtp);

        if (originalOtp !== enterotp) {
            return res.json({ fail: "OTP does not match" });
        }

        const hashedPass = await bcrypt.hash(userdata.password, 10);

        const newUser = new model.usersModel({
            firstName: userdata.username,
            lastName: userdata.lastname,
            password: hashedPass,
            phoneNumber: userdata.phoneNumber,
            email: userdata.email,
            isBlocked: false,
        });

        await newUser.save();
        delete req.session.userdata.otp;

        return res.json({ success: "OTP verified and user registered" });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Server Error" });
    }
};

const verifyLoginPageLoad = async (req, res) => {
    try {
        const { email, password } = req.body;


        const passcheck = await model.usersModel.findOne({ email });

        if (!passcheck) {
            return res.json({ notuser: "User does not exist" });
        }



        if (!passcheck.password || typeof passcheck.password !== 'string') {
            return res.status(500).json({ error: "User password is not stored properly" });
        }

        const isMatch = await bcrypt.compare(password, passcheck.password);

        if (!isMatch) {
            return res.json({ fail: "Password is wrong" });
        }

        req.session.user = passcheck;
        return res.json({ success: "Login successful" });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("Server Error");
    }
};



const forgotEmailVerifyPageLoad = async (req, res) => {
    try {
        const otp = generateOTP();
        const data = req.body.email
        req.session.otp = otp
        let check;
        if (data.includes('@')) {
            check = await model.usersModel.findOne({ email: data })
        } else {
            check = await model.usersModel.findOne({ phoneNumber: data })
        }
        if (check) {
            console.log(`Generated OTP for ${check.email}: ${otp}`);
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.NODEMAILER_EMAIL,
                    pass: process.env.NODEMAILER_PASSWORD,
                }
            });

            const info = await transporter.sendMail({
                from: process.env.NODEMAILER_EMAIL,
                to: check.email,
                subject: "verify otp ",
                text: `your otp is ${otp}`
            });
            req.session.email = check.email
            res.json({ success: "its successs" })
            return info.accepted.length > 0;
        } else {
            return res.json({ fail: "email not found" })
        }
    } catch (error) {
        console.error(error)
        res.status(500).send("Server Error");
    }
}

const verifyForgotOtpPageLoad = async (req, res) => {
    try {
        const enterotp = req.body.otp
        const orignalOtp = req.session.otp
        if (orignalOtp == enterotp) {
            return res.json({ success: "its oky" })
        } else {
            return res.json({ fail: "OTP is Wrong" })
        }
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}

const recoveryPassVerifyPageLoad = async (req, res) => {
    try {
        const { newpass, confmpass } = req.body;
        const email = req.session.email;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Session expired or email not found in session',
            });
        }

        if (!newpass || !confmpass) {
            return res.status(400).json({
                success: false,
                message: 'Both password fields are required',
            });
        }

        if (newpass !== confmpass) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match',
            });
        }

        const hashedPass = await bcrypt.hash(newpass, 10);

        const user = await model.usersModel.findOneAndUpdate(
            { email },
            { password: hashedPass },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        req.session.email = null;

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({
            success: true,
            message: 'Internal server error',
            redirectUrl: '/user/login'
        });
    }
}

const updatedProfilePageLoad = async (req, res) => {
    try {
        const userData = req.session.user
        const id = userData._id
        const name = req.body.name
        const lastname = req.body.lastname
        const phoneNumber = req.body.phoneNumber

        const update = await model.usersModel.findByIdAndUpdate(
            { _id: id },
            {
                firstName: name,
                lastName: lastname,
                phoneNumber: phoneNumber
            },
            { new: true, runValidators: true }
        )
        req.session.user = {
            _id: id,
            firstName: name,
            lastName: lastname,
            phoneNumber: phoneNumber,
            isBlocked: false
        }
        await update.save()
        return res.json({ msg: "its oky" })
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}

const changeEmailPageLoad = async (req, res) => {
    try {
        res.render("user/chengeemail")

    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}

const chengeEmailOTP = async (req, res) => {
    try {
        res.render("user/chengeEmailOTP")
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}

const verifyChengepassword = async (req, res) => {
    try {
        const userdata = req.session.user
        const id = userdata._id
        const current = req.body.current
        const newpass = req.body.newpass
        const confirmpass = req.body.confirmpass

        const original = await model.usersModel.findById(id)
        const isMatch = await bcrypt.compare(current, original.password);
        if (!isMatch) {
            return res.json({ fail: "current password is Incurrect" })
        }
        if (confirmpass !== newpass) {
            return res.json({ match: "new password and confrimpasswas not matching" })
        }
        const chengepass = await model.usersModel.findByIdAndUpdate(
            { _id: id },
            { password: newpass },
            { new: true }
        )

        await chengepass.save()
        return res.json({ success: "its oky" })
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}

const ChengeEmail = async (req, res) => {
    try {
        const otp = generateOTP();
        const { email } = req.body;



        const id = req.session?.user?._id;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return res.json({ msg: "Please enter a valid email" });
        }

        if (!id) {
            return res.json({ msg: "User session ID is missing" });
        }


        const check = await model.usersModel.findOne({ email });


        if (check) {
            console.log(`Generated OTP for ${check.email}: ${otp}`);

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.NODEMAILER_EMAIL,
                    pass: process.env.NODEMAILER_PASSWORD,
                }
            });



            const info = await transporter.sendMail({
                from: process.env.NODEMAILER_EMAIL,
                to: check.email,
                subject: "Verify OTP",
                text: `Your OTP is ${otp}`
            });

            req.session.email = check.email;
            req.session.otp = otp;

            return res.json({ success: "OTP sent successfully" });
        } else {
            return res.json({ fail: "Email not found" });
        }

    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Server Error");
    }
};

const verifiyEmailOTP = async (req, res) => {
    try {
        const { enterotp } = req.body

        const orginalOTP = req.session.otp

        if (!enterotp) {
            return res.json({ msg: "otp not entered" })
        }

        if (!orginalOTP) {
            return res.json({ msg: "orgonal otp is not coming" })
        }
        if (enterotp !== orginalOTP) {
            return res.json({ fail: "otp was not matching" })
        }
        return res.json({ success: "its done" })
    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Server Error");
    }
}
const chengeEmailresendOtp = async (req, res) => {
    try {
        const user = req.session.user
        const newOtp = generateOTP();
        if (user) {

            req.session.otp = newOtp;


            console.log("OTP resent:", newOtp);

            return res.json({ message: "OTP resent successfully" });
        } else {
            return res.status(400).json({ error: "User session not found" });
        }
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Server Error" });
    }
};
const newEmailPageLoad = async (req, res) => {
    try {
        res.render("user/newemail")

    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Server Error");
    }
}

const newEmailVeryfy = async (req, res) => {
    try {
        const { email } = req.body
         const otp = generateOTP();
        const oldEmail = req.session.email
    

        if (!email) {
            return res.json({ fail: "email is not entered" })
        }
        if (!oldEmail) {
            return res.json({ msg: "oldemail is not entered" })
        }

        if (oldEmail == email) {
            return res.json({ fail: "you entered same email" })
        }

        const check = await model.usersModel.findOne({ email:oldEmail});


        if (check) {
            console.log(`Generated OTP for ${email}: ${otp}`);

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.NODEMAILER_EMAIL,
                    pass: process.env.NODEMAILER_PASSWORD,
                }
            });



            const info = await transporter.sendMail({
                from: process.env.NODEMAILER_EMAIL,
                to: check.email,
                subject: "Verify OTP",
                text: `Your OTP is ${otp}`
            });


            req.session.otp = otp;
              req.session.newEmail = email
            return res.json({ success: "OTP sent successfully" });
        } else {
            return res.json({ fail: "Email not found" });
        }

     

   


    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Server Error");
    }
}
const chengeConfrimEmailOTP = async (req, res) => {
    try {
        res.render("user/chengeEmailConfrim")
    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Server Error");
    }
}
const chengeConfrimEmailOTPverify = async (req, res) => {
    try {
        const {enterotp} = req.body
        const orginalOTP = req.session.otp
        const email = req.session.newEmail
        const oldEmail = req.session.email
        const userID = req.session.user?._id
        
        if(!enterotp){
            return res.json({fail:"plaes enter your OTP"})
        }
        
        if(!orginalOTP){
            return res.json({msg:"not coming there original otp"})
        }
         
        if (!email) {
            return res.json({ mag: "new email not coming" })
        }
         
       
         
        if (!userID) {
            return res.json({ msg: "user ID is not coming" })
        }
        
        if(orginalOTP!==enterotp){
            return json({fail:"its dose not the otp"})
        }
    
        const chengEmail = await model.usersModel.findByIdAndUpdate(
            { _id: userID },
            { email: email },
            { new: true }
        )
        

        await chengEmail.save()
         
        return res.json({success:"its done"})
    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Server Error");
    }
}
const  chengeConfrimEmailOTPverifyResendOTP = async (req,res) => {
    try {
          const user = req.session.user
        const newOtp = generateOTP();
        if (user) {

            req.session.otp = newOtp;


            console.log("OTP resent:", newOtp);

            return res.json({ message: "OTP resent successfully" });
        } else {
            return res.status(400).json({ error: "User session not found" });
        }
    } catch (error) {
         console.error(error.message);
        return res.status(500).send("Server Error");
    }
}
const googleAuth = async (req, res) => {
  try {
    const user = req.user._id;
    const userdata = await model.usersModel.findById(user);
    req.session.user = userdata;
    res.redirect("/");
  } catch (error) {
    console.log("Google Auth Error:", error);
    res.redirect("/login");
  }
};


const logout = async (req, res) => {
    try {
        req.session.destroy()
        res.redirect("/")
    } catch (error) {
        console.error(error.message)
        res.status(500).send("Server Error");
    }
}

module.exports = {
    landingPageLoad,
    loginPageLoad,
    recoveryemailPageload,
    recoverypassPageload,
    forgetpassOtpPageLoad,
    signupOtpPageLoad,
    registerPageLoad,
    verifySignupPageLoad,
    profilePageLoad,
    chengePasswordPageLoad,
    verifySignOtpPageLoad,
    verifyLoginPageLoad,
    forgotEmailVerifyPageLoad,
    verifyForgotOtpPageLoad,
    resendOtp,
    recoveryPassVerifyPageLoad,
    changeEmailPageLoad,
    chengeEmailOTP,
    updatedProfilePageLoad,
    verifyChengepassword,
    ChengeEmail,
    verifiyEmailOTP,
    chengeEmailresendOtp,
    newEmailPageLoad,
    newEmailVeryfy,
    chengeConfrimEmailOTP,
    chengeConfrimEmailOTPverify,
    chengeConfrimEmailOTPverifyResendOTP,
    googleAuth,
    logout,
}