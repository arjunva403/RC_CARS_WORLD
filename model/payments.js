const mongoose = require("mongoose")

const paymentSchema = new mongoose.Schema({
    orderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "order",
        required: true,
    },
    customerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    transactionId:{
        type:String,
        required:true,
    },
    amountPaid:{
        type:Number,
        required:true,
    },
    paymentStatus:{
    type:String,
    default:false,
    enum:["Success","Pending","Failed","Refunded"]
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    updatedAt:{
        type:Date,
        default:Date.now
    }
},{ timestamps: true })


module.exports = mongoose.model("payments",paymentSchema)
