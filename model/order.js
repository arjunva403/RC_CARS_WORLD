const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: {
    type: Number,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  orderitems: [{
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "product",
    required: true
  },
  quantity: { type: Number, required: true },
  price: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Pending', 'Ordered', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled', 'Return Request', 'Returned', 'Return Rejected', 'Return Accepted'],
    default: 'Pending'
  },
  cancellationReason: { type: String, default: 'none' },
  returnReason: { type: String, default: 'none' }
}],

  orderStatus: {
    type: String,
    enum: [
      'Pending', 'Ordered', 'Cancelled', 'Partially Cancelled',
      'Shipped', 'Out For Delivery', 'Delivered','Partially Return Request',
      'Return Request', 'Returned', 'Return Accepted', 'Return Rejected'
    ],
    default: 'Pending',
  },
  orderStatusUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  GST: {
    type: Number,
    default: 0,
  },

  finalAmount: {
    type: Number,
    required: true,
  },
  shippingAddress: {
    addressType: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    landmark: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    altPhone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['COD', 'razorpay', 'Card', 'Wallet'],
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  invoiceDate: {
    type: Date,
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("order", orderSchema);
