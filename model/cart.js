const mongoose = require("mongoose")

const cartSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "product",
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
        },
        basePrice: {
            type: Number,
            reqired: true
        },
        discountPrice: {
            type: Number,
            required: true
        },
        subTotel: {
            type: Number,
            require: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true })


module.exports = mongoose.model("cart", cartSchema)