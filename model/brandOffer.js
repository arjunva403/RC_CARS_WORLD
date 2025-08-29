const mongoose = require("mongoose");

const brandOfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
     brandId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "brand",
       required: true,
     },
 
    discount: {
      type: Number,
      required: true,
      min: 1,
      max: 100
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("brandOffer", brandOfferSchema);
