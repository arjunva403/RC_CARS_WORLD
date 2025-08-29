const mongoose = require("mongoose")

const brandSchema = new mongoose.Schema({
  
    brandName:{
        type:String,
        required:true,
    },
   isListed:{
    type:Boolean,
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

module.exports = mongoose.model("brand",brandSchema)