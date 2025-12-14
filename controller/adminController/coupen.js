const model = require("../../src/config")

const coupenPageLoad = async (req, res) => {
  try {
    const now = new Date();

    // Mark expired
    await model.couponModel.updateMany(
      { expiryDate: { $lt: now }, status: { $ne: "expired" } },
      { $set: { status: "expired" } }
    );

    // Optionally, auto-activate future-valid coupons
    await model.couponModel.updateMany(
      { expiryDate: { $gte: now }, startDate: { $lte: now }, status: { $ne: "inactive" } },
      { $set: { status: "active" } }
    );

    const coupen = await model.couponModel.find();

    const formattedCoupen = coupen.map(offer => {
      const startDate = new Date(offer.startDate);
      const expiryDate = new Date(offer.expiryDate);

      return {
        ...offer.toObject(),
        formattedStartDate: startDate.toISOString().split("T")[0],
        formattedEndDate: expiryDate.toISOString().split("T")[0],
        displayStartDate: startDate.toLocaleDateString(),
        displayEndDate: expiryDate.toLocaleDateString(),
        status: offer.status,
      };
    });

    res.render("admin/coupon", { coupen: formattedCoupen });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};




const addCouponPost = async (req, res) => {
  try {
    const { couponCode, couponType, Amount, Limit, description, start, end } = req.body;

    const couponAmount = Number(Amount);
    const usageLimit = Number(Limit);

    if (!couponCode) return res.json({ fail: "couponCode not entered" });
    if (!couponType) return res.json({ fail: "couponType not entered" });
    if (!couponAmount) return res.json({ fail: "couponAmount not entered" });
    if (!usageLimit) return res.json({ fail: "usageLimit not entered" });
    if (!description) return res.json({ fail: "description not entered" });
    if (!start) return res.json({ fail: "startDate not entered" });
    if (!end) return res.json({ fail: "expiryDate not entered" });

    if (couponType === "Percentage" && (couponAmount <= 0 || couponAmount > 100)) {
      return res.json({ fail: "couponAmount must be between 1-100%" });
    }
    if (usageLimit <= 0) {
      return res.json({ fail: "Invalid usageLimit" });
    }

    const startDate = new Date(start);
    const expiryDate = new Date(end);
    if (expiryDate <= startDate) {
      return res.json({ fail: "End date must be after start date" });
    }

    const now = new Date();
    const status = expiryDate > now ? "active" : "expired";

    const newCoupon = new model.couponModel({
      couponCode,
      couponType,
      couponAmount,
      usageLimit,
      usedCount: 0,
      description,
      status,
      startDate,
      expiryDate,
    });

    await newCoupon.save();
    return res.json({ success: "Coupon added successfully!" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};


const getUpdateData = async (req, res) => {
    try {
        const coupon = await model.couponModel.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }


        const formatDate = (date) => {
            return date ? new Date(date).toISOString().split('T')[0] : '';
        };

        res.json({
            success: true,
            coupon: {
                _id: coupon._id,
                couponCode: coupon.couponCode,
                couponType: coupon.couponType,
                couponAmount: coupon.couponAmount,
                usageLimit: coupon.usageLimit,
                description: coupon.description || '',
                startDate: formatDate(coupon.startDate),
                expiryDate: formatDate(coupon.expiryDate || coupon.endDate),
                status: coupon.status || 'active'
            }
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
}


const updateCoupen = async (req, res) => {
  try {
    const coupenID = req.params.id;
    const { couponCode, couponType, Amount, Limit, description, start, end, status } = req.body;

    if (!coupenID) return res.json({ fail: "coupen id not defined" });

    const couponAmount = Number(Amount);
    const usageLimit = Number(Limit);

    if (couponType === "Percentage" && (couponAmount <= 0 || couponAmount > 100)) {
      return res.json({ fail: "couponAmount must be between 1-100%" });
    }
    if (usageLimit <= 0) {
      return res.json({ fail: "Invalid usageLimit" });
    }

    const startDate = new Date(start);
    const expiryDate = new Date(end);
    if (expiryDate <= startDate) {
      return res.json({ fail: "End date must be after start date" });
    }

    const now = new Date();
    let computedStatus = status;
    if (!computedStatus) {
      computedStatus = expiryDate < now ? "expired" : "active";
    }

    const updated = await model.couponModel.findByIdAndUpdate(
      coupenID,
      {
        couponCode,
        couponType,
        couponAmount,
        usageLimit,
        description,
        status: computedStatus,
        startDate,
        expiryDate,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ fail: "Offer not found" });
    }

    return res.json({ success: "Coupon updated successfully!" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};


const deleteCoupen = async (req, res) => {
    try {
        const coupenID = req.params.id
        if (!coupenID) {
            return res.json({ fail: "coupen id not defained" })
        }
        const deleteCoupen = await model.couponModel.findByIdAndDelete({ _id: coupenID })
        if (!deleteCoupen) {
            return res.status(404).json({ fail: "coupen not found" });
        }

        res.json({ success: true, message: "coupen deleted successfully" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
}

module.exports = {
    coupenPageLoad,
    addCouponPost,
    getUpdateData,
    updateCoupen,
    deleteCoupen,
}