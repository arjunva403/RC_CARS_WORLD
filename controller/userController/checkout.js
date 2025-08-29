const model = require("../../src/config");
 const Best = require("../../helpers/bestOffers")

const checkOutPageLoad = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        
        if (!userId) {
            return res.redirect('/login');
        }
        
        const now = new Date();
        now.setDate(now.getDate() + 5);
        
        // Use findOne for single cart document (not find which returns array)
        const cartDoc = await model.cartModel.findOne({ userId }).populate('items.productId');
        const address = await model.addressModel.find({ userId });
        const product = await model.productModel.find({}).limit(7);
        const user = await model.usersModel.findById(userId);
        const couponitmes = await model.couponModel.find({ status: "active" });
        
        if (!cartDoc || !cartDoc.items.length) {
            // Handle empty cart
            return res.render("user/checkout", { 
                cartProduct: null, 
                address, 
                totalItems: 0,
                subtotal: 0,
                subtotalOriginal: 0,
                totalSavings: 0,
                ShippingCharge: 150,
                discountAmount: 0,
                finalTotal: 150,
                product,
                deliveryDate: now.toLocaleDateString('en-IN', { month: 'long', day: 'numeric' }),
                year: now.getFullYear(),
                user: user?.email || '',
                coupen: []
            });
        }
        
        let totalItems = 0;
        let subtotalOriginal = 0; // Before offers
        let subtotalWithOffers = 0; // After offers
        
        // Calculate best offers for each cart item
        const enrichedItems = await Promise.all(
            cartDoc.items.map(async (item) => {
                const product = item.productId;
                const quantity = item.quantity;
                
                // Calculate best offer for this product
                const { finalPrice, discountPercentage, discountAmount, offerTitle, offerSource } = 
                    await Best.BestOffer(product);
                
                const applyOffer = !!(offerTitle && discountAmount > 0);
                
                // Calculate item totals
                const originalItemPrice = product.discountPrice;
                const finalItemPrice = finalPrice || product.discountPrice;
                const originalItemTotal = originalItemPrice * quantity;
                const finalItemTotal = finalItemPrice * quantity;
                const itemSavings = originalItemTotal - finalItemTotal;
                
                // Add to running totals
                totalItems += quantity;
                subtotalOriginal += originalItemTotal;
                subtotalWithOffers += finalItemTotal;
                
                return {
                    ...item.toObject(),
                    product: product,
                    originalPrice: originalItemPrice,
                    finalPrice: finalItemPrice,
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
        
      
        
        // Use final prices (after offers) for calculations
        const totalSavings = subtotalOriginal - subtotalWithOffers;
        const subtotal = subtotalWithOffers;
        
        const options = { month: 'long', day: 'numeric' };
        const formattedDate = now.toLocaleDateString('en-IN', options);
        const year = now.getFullYear();
        
        const ShippingCharge = subtotal >= 30000 ? 0 : 150;
        const discountPercent = 15;
        const discountAmount = Math.floor((subtotal * discountPercent) / 100);
        const finalTotal = subtotal + ShippingCharge - discountAmount;
        
        // Filter applicable coupons based on final total
        const coupen = couponitmes.filter((item) => {
            const usageLimit = Number(item.usageLimit);
            return finalTotal >= usageLimit;
        });
        
        // Create enriched cart object
        const enrichedCart = [{
            ...cartDoc.toObject(),
            items: enrichedItems
        }];
        
        res.render("user/checkout", { 
            cartProduct: enrichedCart, 
            address, 
            totalItems, 
            subtotal,
            subtotalOriginal,
            totalSavings,
            ShippingCharge, 
            discountAmount, 
            finalTotal, 
            product,
            deliveryDate: formattedDate,
            year,
            user: user.email,
            coupen
        });
        
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
}


const applycoupen = async (req,res) => {

    try {
         const { totalAmount, input}= req.body
       Amount = Number(totalAmount)
      
     const coupen = await model.couponModel.findOne({ couponCode: input })
     
      if(!totalAmount){
         return res.json({fail:"total amount con't get"})
      }
      if(!input){
         return res.json({fail:"you not enter the coupenCode "})
      }
      if(!coupen){
        return res.json({fail:"coupen dose not exisit"})
      }
      const couponType = coupen.couponType
      const couponAmount=coupen.couponAmount
     

      if(couponType =="percentage"){
        const discount =(Amount * couponAmount) / 100;
           let newtotal = Amount-discount
          
         return res.json({success:"coupen addedd successfully",Amount:newtotal})
      }else if(couponType=="fixed"){
          let newtotal = Amount-couponAmount
          return res.json({success:"coupen addedd successfully",Amount:newtotal})
      }
    
      return res.json({fail:"coupon apply is failed"})
       
    } catch (error) {
          console.error(error.message);
    res.json({ success: false, error: "Server error" });
    }
      

}

const removeAddressfromcheckout = async (req, res) => {
    try {
    const { userId, addressIndex } = req.body;

    const user = await model.addressModel.findById(userId);
    if (!user) return res.json({ success: false, error: "User not found" });

    user.address.splice(addressIndex, 1); 
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, error: "Server error" });
  
}
}

module.exports = {
    checkOutPageLoad,
    applycoupen,
    removeAddressfromcheckout,
}