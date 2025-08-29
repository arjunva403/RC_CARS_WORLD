const mongoose = require("mongoose")

const adminSchema=new mongoose.Schema({
    adminName:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
    },
    password:{
        type:String,
        required:true
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


module.exports=mongoose.model("admin",adminSchema)