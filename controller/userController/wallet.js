const model = require("../../src/config")
const razorpay = require('../../src/rezorpay');
const crypto = require("crypto");

const walletPageLoad = async (req, res) => {
  try {
     const userId = req.session.user?._id
     
    if (!userId) {
      return res.redirect("/login");
    }
     const users = await model.usersModel.findById({_id:userId})
    const wallet = await model.walletModel.findOne({ customerId: userId });
    
    if (!wallet) {
      return res.render("user/wallet", {
        wallet: { totalBalance: 0, transactions: [] },
        transactions: [],
        currentPage: 1,
        totalPages: 1,
        totalTransactions: 0,
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = 10;                  // transactions per page
    const skip = (page - 1) * limit;

    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.max(1, Math.ceil(totalTransactions / limit));

    // Newest first
    const sortedTransactions = wallet.transactions
      .slice()
      .sort((a, b) => b.date - a.date);

    const transactions = sortedTransactions.slice(skip, skip + limit);

    return res.render("user/wallet", {
      wallet,
      users,
      transactions,
      currentPage: page,
      totalPages,
      totalTransactions,
      users,
    });
  } catch (error) {
    console.error("wallet page load error:", error);
    return res.status(500).json({ failed: "Server Error" });
  }
};


const addMoney = async (req, res) => {
  try {
    const { paymentMethod, amount } = req.body;

    if (!paymentMethod) return res.status(400).json({ fail: "Payment method not defined" });
    if (!amount || amount < 10) return res.status(400).json({ fail: "Amount must be at least ₹10" });

    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ fail: "User not logged in" });
    }

    if (paymentMethod === "razorpay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt: `wallet_rcpt_${Date.now()}`,
        notes: {
          purpose: "Wallet top-up",
          userId: userId.toString(),
        },
      });

      return res.json({
        key: process.env.RAZORPAY_KEY,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        success: true,
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

    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.json({ success: false, message: "Invalid signature" });
    }

    const userId = req.session.user?._id; // or get from notes if you send it back
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const amt = Number(amount);

    const wallet = await model.walletModel.findOneAndUpdate(
      { customerId: userId },
      {
        $inc: { totalBalance: amt, credited: amt },
        $push: {
          transactions: {
            amount: amt,
            type: "credit",
            transactionId: razorpay_payment_id,
            remark: "Wallet top-up via Razorpay",
            date: new Date(),
          },
        },
      },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      message: "Payment verified and wallet updated",
      wallet,
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