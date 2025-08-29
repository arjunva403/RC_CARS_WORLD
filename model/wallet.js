const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); 


const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    default: () => uuidv4(),
    unique: true
  },
  type: {
    type: String,
    enum: ["credit", "debit"],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  remark: {
    type: String,
    default: ""
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const walletSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  credited: {
    type: Number,
    default: 0
  },
  debited: {
    type: Number,
    default: 0
  },
  totalBalance: {
    type: Number,
    required: true,
    default: 0
  },
  transactions: [transactionSchema],
}, { timestamps: true });

module.exports = mongoose.model("wallet", walletSchema);
