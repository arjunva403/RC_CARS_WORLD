const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  couponCode: {
    type: String,
    required: true,
    unique: true,      // avoid duplicates
  },
  couponType: {
    type: String,
    required: true,
  },
  couponAmount: {
    type: Number,
    required: true,
  },
  usageLimit: {
    type: Number,
    required: true,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "expired"],
    default: "inactive",
  },
  startDate: {
    type: Date,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
}, { timestamps: true });


module.exports = mongoose.model("Coupon", couponSchema);
