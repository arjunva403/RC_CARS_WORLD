const { json } = require('express-cookie/lib/response');
const model = require('../../src/config')
const Best = require("../../helpers/bestOffers")

const cartLoadPage = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    
    if (!userId) {
      return res.redirect('/login');
    }

  
    const cart = await model.cartModel.findOne({ userId }).populate('items.productId');
    
    if (!cart || !cart.items.length) {
    
      const product = await model.productModel.find({}).limit(7);
      return res.render("user/cart", { 
        cart: null, 
        product,
        totalItems: 0,
        subtotal: 0,
        subtotalOriginal: 0,
        totalSavings: 0,
        deliveryCharge: 0,
        discountAmount: 0,
        finalTotal: 0
      });
    }

    
    const productIds = cart.items.map(item => item.productId._id);

    
    const products = await model.productModel
      .find({ _id: { $in: productIds } })
      .populate('categoryId brandId');

  

    
    let totalItems = 0;
    let subtotalOriginal = 0; 
    let subtotalWithOffers = 0; 

    const enrichedItems = await Promise.all(
      cart.items.map(async (cartItem) => {
        const product = products.find(p => p._id.equals(cartItem.productId._id));
        
        if (!product) {
          return cartItem;
        }

        
        const { finalPrice, discountPercentage, discountAmount, offerTitle, offerSource } = 
          await Best.BestOffer(product);

        const applyOffer = !!(offerTitle && discountAmount > 0);
        
        
        const quantity = cartItem.quantity;
        const originalItemTotal = product.discountPrice * quantity;
        const finalItemTotal = (finalPrice || product.discountPrice) * quantity;
        const itemSavings = originalItemTotal - finalItemTotal;

        
        totalItems += quantity;
        subtotalOriginal += originalItemTotal;
        subtotalWithOffers += finalItemTotal;

        return {
          ...cartItem.toObject(),
          product: product,
          originalPrice: product.discountPrice,
          finalPrice: finalPrice || product.discountPrice,
          discountPercentage: discountPercentage || 0,
          discountAmount: discountAmount || 0,
          offerTitle: offerTitle || null,
          offerSource: offerSource || null,
          applyOffer,
          originalItemTotal,
          finalItemTotal,
          itemSavings
        };
      })
    );

 

    
    const totalSavings = subtotalOriginal - subtotalWithOffers;
    const subtotal = subtotalWithOffers; 

    const deliveryCharge = subtotal >= 30000 ? 0 : 150;
    const discountPercent = 15;
    const discountAmount = Math.floor((subtotal * discountPercent) / 100);
    const finalTotal = subtotal + deliveryCharge - discountAmount;

    
    const product = await model.productModel.find({}).limit(7);

  
    const enrichedCart = {
      ...cart.toObject(),
      items: enrichedItems
    };

    res.render("user/cart", { 
      cart: enrichedCart, 
      product, 
      totalItems, 
      subtotal,
      subtotalOriginal,
      totalSavings,
      deliveryCharge, 
      discountAmount, 
      finalTotal 
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};


const PostCart = async (req, res) => {
  try {
    const userID = req.session.user?._id;
    const { productId, qty } = req.body;


    if (!userID) {
      return res.status(401).json({ success: false, message: "Please log in to add items to cart." });
    }

    const productDetails = await model.productModel.findById(productId);
    if (!productDetails) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    if (productDetails.stock === 0) {
      return res.status(404).json({ success: false, message: "No Stock in there" });
    }
    const cart = await model.cartModel.findOne({ userId: userID });

    if (cart) {
      const existingItem = cart.items.find(item => item.productId.equals(productId));

      if (existingItem) {
        return res.status(200).json({ success: false, message: "Product already in cart." });
      }

      cart.items.push({
        productId,
        quantity: qty,
        basePrice: productDetails.baseprice,
        discountPrice: productDetails.discountPrice
      });

      await cart.save();
    } else {
      await model.cartModel.create({
        userId: userID,
        items: [{
          productId,
          quantity: qty,
          basePrice: productDetails.baseprice,
          discountPrice: productDetails.discountPrice
        }]
      });
    }

    return res.status(200).json({ success: true, message: "Product added to cart successfully!" });

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};




const qtyUpdate = async (req, res) => {
  try {
    const { qty, productId } = req.body;
    const userID = req.session.user._id;
    const product = await model.productModel.findById({ _id: productId })

    const existingCart = await model.cartModel.findOne({ userId: userID });
    if (!existingCart) {
      return res.status(404).json({ fail: "Cart not found" });
    }

    const itemIndex = existingCart.items.findIndex(item => item.productId.equals(productId));

    if (itemIndex === -1) {
      return res.status(404).json({ fail: "Product not found in cart" });
    }

    const updatedQty = existingCart.items[itemIndex].quantity + qty;

    if (updatedQty <= 0) {
      existingCart.items.splice(itemIndex, 1);
    } else {
      existingCart.items[itemIndex].quantity = updatedQty;
    }
    if (product.stock < updatedQty) {
      return res.json({ fail: "No stock in there" });
    }
    await existingCart.save();
    return res.json({ success: "Quantity updated successfully" });

  } catch (error) {
    console.error("Quantity Update Error:", error.message);
    res.status(500).send("Server Error");
  }
};


const removeCartItems = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const result = await model.cartModel.updateOne(
      { userId },
      { $pull: { items: { productId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Product not found in cart" });
    }

    res.json({ success: true, message: "Cart item removed successfully" });
  } catch (error) {
    console.error("Remove Cart Error:", error.message);
    res.status(500).send("Server Error");
  }
};



module.exports = {
  cartLoadPage,
  PostCart,
  qtyUpdate,
  removeCartItems,
}

