const model = require("../src/config");

const BestOffer = async (product) => {
    const Price = product.discountPrice;
    let bestPrice = Price; 
    let discountAmount = 0;
    let offerTitle = null;
    let offerSource = null;
    let applyOffer = false;

    // Validate input price
    if (!Price || Price <= 0) {
        return {
            finalPrice: Price,
            discountAmount: 0,
            discountPercentage: "0.00",
            offerTitle: null,
            offerSource: null,
            applyOffer: false
        };
    }

    // ---------- Product Offers ----------
    const productOffers = await model.offerModle.find({ 
        productId: product._id,
        status: "active" 
    });

    for (let offer of productOffers) {
        if (offer.discount && offer.discount > 0) {
            const discountedPrice = Price - (Price * (offer.discount / 100));
            
            if (discountedPrice < bestPrice) {
                bestPrice = discountedPrice;
                discountAmount = Price - discountedPrice;
                offerTitle = offer.title;
                offerSource = "Product";
                applyOffer = true;
            }
        }
    }

    // ---------- Category Offers ----------
    const categoryOffers = await model.categoryOffer.find({ 
        categoryId: product.categoryId,
        status: "active" 
    });
   
    for (let offer of categoryOffers) {
        if (offer.discount && offer.discount > 0) {
            const discountedPrice = Price - (Price * (offer.discount / 100));
            
            if (discountedPrice < bestPrice) {
                bestPrice = discountedPrice;
                discountAmount = Price - discountedPrice;
                offerTitle = offer.title;
                offerSource = "Category";
                applyOffer = true;
            }
        }
    }

    // ---------- Brand Offers ----------
    const brandOffers = await model.brandOffer.find({ 
        brandId: product.brandId,
        status: "active" 
    });
   
    for (let offer of brandOffers) {
        
        if (offer.discount && offer.discount > 0) {
            const discountedPrice = Price - (Price * (offer.discount / 100));
            
            if (discountedPrice < bestPrice) {
                bestPrice = discountedPrice;
                discountAmount = Price - discountedPrice;
                offerTitle = offer.title;
                offerSource = "Brand";
                applyOffer = true;
            }
        }
    }

    // ---------- Final Return ----------
    const discountPercentage = discountAmount > 0 ? (discountAmount / Price) * 100 : 0;

    return {
        finalPrice: Math.round(bestPrice * 100) / 100, // Round to 2 decimal places
        discountAmount: Math.round(discountAmount * 100) / 100,
        discountPercentage: discountPercentage.toFixed(2),
        offerTitle,
        offerSource,
        applyOffer
    };
};

module.exports = { BestOffer };
