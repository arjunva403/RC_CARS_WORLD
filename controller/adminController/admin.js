const bcrypt = require("bcrypt")
const model = require("../../src/config")


const adminLoginPageLoad = async (req, res) => {
    try {
        res.render("admin/adminlogin")
    } catch (error) {
        console.error(error.message)
         res.status(500).send("Server Error");
    }
}

const verifyAdminLoginPageLoad = async (req, res) => {
    try {
        const { username, password } = req.body
        const admin = await model.adminModel.findOne({ adminName: username })
        if (!admin) {
            return res.json({ wronguser: "username is wrong" })
        }
        const isMatch = await bcrypt.compare(password, admin.password)
        if (!isMatch) {
            return res.json({ wrongpass: "password is wrong" })
        } else if (admin && isMatch) {
            req.session.admin=admin
            return res.json({ success: "login success" })
        }

    } catch (error) {
        console.error(error.message)
         res.status(500).send("Server Error");
    }
}

const adminDashBoardPageLoad = async (req, res) => {
    try {
        res.render("admin/dashboard")
    } catch (error) {
        console.error(error.message)
         res.status(500).send("Server Error");
    }
}
const userManagePageLoad = async (req, res) => {
    try {
        const searchQuery = req.query.search || "";
        const page = parseInt(req.query.page)|| 1;
        const limit = 3;

        const filter={
            $or:[
                {name:{$regex:searchQuery,$options:'i'}},
                {email:{$regex:searchQuery,$options:'i'}}
            ]
        }

            const totaluser = await model.usersModel.countDocuments(filter)
            const totalpage = Math.ceil(totaluser / limit)
        const users = await model.usersModel.find(filter)
        .sort({createdAt:-1})
        .skip((page - 1) * limit)
        .limit(limit)
        res.render("admin/usermanage", { users,totaluser,totalpage,searchQuery,page})
    } catch (error) {
        console.error(error.message)
         res.status(500).send("Server Error");
    }
}
const userManageEdit = async (req, res) => {
    try {
        const userId = req.params.userId
        const userdata = await model.usersModel.findById(userId)
        userdata.isBlocked = !userdata.isBlocked

        await userdata.save()

    } catch (error) {
        console.error(error.message)
         res.status(500).send("Server Error");
    }
}


const logout = async (req,res) => {
    try {
     req.session.destroy()
     res.redirect("/")
    } catch (error) {
        console.error(error.message)
         res.status(500).send("Server Error");
    }
}


module.exports = {
    adminLoginPageLoad,
    verifyAdminLoginPageLoad,
    adminDashBoardPageLoad,
    userManagePageLoad,
    userManageEdit,
     logout,
}