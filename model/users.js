const mongoose = require("mongoose")

const userschema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: false,
    },
    googleId:{
        type:String,
        uinique:true
    },
    phoneNumber: {
        type: String,
        required: false,
        sparse:true,
        default:null,
    },
    isBlocked: {
        type: Boolean,
        required: false,
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    updatedAt:{
        type:Date,
        default:Date.now
    }


},

    { timestamps: true }
)

module.exports = mongoose.model("user", userschema)