const mongoose = require("mongoose")

const addressSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users",
        required:true,

    },
    address:[{
     name:{
        type:String,
        require:false
    },
    phoneNumber:{
        type:String,
        required:true,
    },
    pincode:{
        type:Number,
        required:true,
    },
    locality:{
        type:String,
        required:true,
    },
    houseNo:{
        type:String,
        required:true,
    },
    state:{
        type:String,
        required:true,
    },
    city:{
        type:String,
        required:true,
    },
    landMark:{
        type:String,
        required:true,
    },
    altPhoneNumber:{
        type:String,
        required:true,
    },
    addressType:{
     type:String,
     default:false,
     enum:["home","work","other"]

    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    updatedAt:{
        type:Date,
        default:Date.now
    }
    }],
   
},
{ timestamps: true }
)


module.exports = mongoose.model("address",addressSchema)