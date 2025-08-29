const mongoose = require("mongoose")

const categorySchema = new mongoose.Schema({
    categoryName:{
        type:String,
        required:true,   
    },
    visibility:{
     type:String,
     enum:["active","inActive"]
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

module.exports = mongoose.model("category",categorySchema)