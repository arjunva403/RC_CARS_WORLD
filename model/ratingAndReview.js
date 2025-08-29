const mongoose = require("mongoose")

const ratingAndReviewSChema = new mongoose.Schema({

    reviewMessage: {
        type: String,
        required: true,
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
        required: true,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }

},{ timestamps: true })

module.exports = mongoose.model("ratingAndReview",ratingAndReviewSChema)