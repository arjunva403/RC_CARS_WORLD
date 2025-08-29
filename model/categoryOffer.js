const mongoose = require("mongoose");

const  categoryOfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
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

module.exports = mongoose.model(" categoryOffer", categoryOfferSchema);
