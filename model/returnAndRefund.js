const mongoose = require("mongoose")

const returnAndRefundSchema = new  mongoose.Schema({
    description :{
        type:String,
        required:true,
    },
    customerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    status:{
    type:String,
    default:false,
    enum:["accepted","rejected"]
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    updatedAt:{
        type:Date,
        default:Date.now
    },
},{ timestamps: true })

module.exports = mongoose.model("returnAndRefund",returnAndRefundSchema)