const model = require("../../src/config")
const razorpay = require('../../src/rezorpay');
const crypto = require("crypto");

const walletPageLoad = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    
    const wallet = await model.walletModel.findOne({ customerId: userId });

    if (!wallet) {
      return res.render("user/wallet", {
        wallet: { totalBalance: 0, transactions: [] }
      });
    }

    res.render("user/wallet", { wallet });
  } catch (error) {
    console.error("wallet page load error:", error);
    res.status(500).json({ failed: "Server Error" });
  }
};

const addMoney = async (req, res) => {
  try {
    const { paymentMethod, amount } = req.body;

    if (!paymentMethod) return res.status(400).json({ fail: "Payment method not defined" });
    if (!amount || amount < 10) return res.status(400).json({ fail: "Amount must be at least ₹10" });

    if (paymentMethod === "razorpay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: amount * 100, // amount in paise
        currency: "INR",
        receipt: `wallet_rcpt_${Date.now()}`,
        notes: {
          purpose: "Wallet top-up",
          userId: req.user._id.toString() // Store user ID for reference
        }
      });

      return res.json({
        key: process.env.RAZORPAY_KEY,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        success: true
      });
    }

    return res.status(400).json({ fail: "Unsupported payment method" });

  } catch (error) {
    console.error("wallet add money error:", error);
    res.status(500).json({ failed: "Server Error" });
  }
};

const verifyWalletPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;
    
    // Verify the payment signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');
    
    if (generated_signature !== razorpay_signature) {
      return res.json({ success: false, message: "Invalid signature" });
    }
    
    // Update user's wallet balance
    const userId = req.user._id; 
    const wallet = await model.walletModel.findOneAndUpdate(
      {customerId:userId },
      { 
        $inc: { totalBalance: amount },
        $push: { 
          transactions: {
            amount: amount,
            type: 'credit',
            transactionId: razorpay_payment_id,
            remark: 'Wallet top-up via Razorpay',
            date: new Date()
          }
        }
      },
      { new: true, upsert: true }
    );
    
    return res.json({ 
      success: true,
      message: "Payment verified and wallet updated",
      wallet
    });
    
  } catch (error) {
    console.error("Wallet payment verification error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
module.exports ={
    walletPageLoad,
    addMoney,
    verifyWalletPayment,
}