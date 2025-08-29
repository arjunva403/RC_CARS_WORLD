const model = require("../../src/config")


const wishlistPageLoad = async (req, res) => {
  try {
   const wishlist = await model.wishlistModel.find({ userId: req.session.user._id }).populate("products.productId");
    res.render("user/wishlist", { wishlist });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};


const Addwishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userID = req.session.user?._id;

    if (!productId || !userID) {
      return res.status(400).json({
        success: false,
        message: "Invalid request. Please login and try again."
      });
    }

    const productDetails = await model.productModel.findById(productId);
    if (!productDetails) {
      return res.status(404).json({
        success: false,
        message: "Product not found."
      });
    }

    let wishlist = await model.wishlistModel.findOne({ userId: userID });

    if (!wishlist) {
      wishlist = new model.wishlistModel({
        userId: userID,
        products: [{
          productId: productId,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      await wishlist.save();
      return res.json({
        success: true,
        message: "Product added to wishlist."
      });
    }

    const existingItem = wishlist.products.find(item =>
      item.productId.toString() === productId
    );

    if (existingItem) {
      return res.json({
        success: false,
        message: "Product already in wishlist."
      });
    }

    wishlist.products.push({
      productId: productId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await wishlist.save();
    return res.json({
      success: true,
      message: "Product added to wishlist."
    });

  } catch (error) {
    console.error("Add to Wishlist Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later."
    });
  }
};

const removeFromWishlist = async (req,res) => {
    try {
           const userId = req.session.user?._id;
    const { productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const result = await model.wishlistModel.updateOne(
      { userId },
      { $pull: { products: { productId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ modifiled: "Product not found in cart" });
    }

    res.json({ success:"Cart item removed successfully" });

    } catch (error) {
         console.error("remove to Wishlist Error:", error.message);
        return res.status(500).send("Server Error");
    }
}


module.exports = {
    wishlistPageLoad,
    Addwishlist,
    removeFromWishlist,
}