const model = require("../../src/config")
const Best = require("../../helpers/bestOffers")
const productLoadPage = async (req, res) => {
    try {
        const user = req.session.user;
        const categorydata = await model.categoryModel.find();
        const branddata = await model.brandModel.find();
        

        let cartCount = 0;
        const userId = req.session.user?._id;

        if (userId) {
            const userCart = await model.cartModel.findOne({ userId });

            if (userCart && userCart.items.length > 0) {
                cartCount = userCart.items.reduce((acc, item) => acc + item.quantity, 0);
            }
        }

        const limit = 6;
        const productdata = await model.productModel
            .find({ isListed: true })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("brandId", "categoryId")

     

        res.render("user/product", {
             productdata,
            categorydata,
            branddata,
            cart: cartCount,
            user,
            
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
};



const productPostPageLoad = async (req, res) => {
    try {
        const query = req.body;
        const {
            searchQuery = '',
            selectedCategories = [],
            selectedBrands = [],
            sort = 'price-asc',
            minPrice = 0,
            maxPrice = 50000,
            currentPage = 1
        } = query;

        const limit = 6;
        const skip = (currentPage - 1) * limit;

        let sortQuery;
        switch (sort) {
            case 'price-asc':
                sortQuery = { discountPrice: 1 };
                break;
            case 'price-desc':
                sortQuery = { discountPrice: -1 };
                break;
            case 'name-asc':
                sortQuery = { productName: 1 };
                break;
            case 'name-desc':
                sortQuery = { productName: -1 };
                break;
            default:
                sortQuery = { createdAt: -1 };
        }

        const andConditions = [
            { discountPrice: { $gte: minPrice, $lte: maxPrice } },
            { isListed: true },
            { isDeleted: false }
        ];

        if (searchQuery.trim() !== '') {
            andConditions.push({
                productName: { $regex: new RegExp(searchQuery, 'i') }
            });
        }

        if (selectedCategories.length > 0) {
            andConditions.push({ categoryId: { $in: selectedCategories } });
        }

        if (selectedBrands.length > 0) {
            andConditions.push({ brandId: { $in: selectedBrands } });
        }

        const finalQuery = { $and: andConditions };

        const totalCount = await model.productModel.countDocuments(finalQuery);

        const product = await model.productModel
            .find(finalQuery)
            .sort(sortQuery)
            .populate('categoryId brandId')
            .skip(skip)
            .limit(limit);

        
        const available = product.filter(p => 
            p.categoryId?.visibility === 'active' && 
            p.brandId?.isListed === true
        );

        
        const BestOfferData = await Promise.all(
            available.map(async (item) => {
                const { finalPrice, discountPercentage, discountAmount, offerTitle, offerSource } = await Best.BestOffer(item);
                
            
                const applyOffer = !!(offerTitle && discountAmount > 0);
                
                return {
                    ...item.toObject(),
                    finalPrice: finalPrice || item.discountPrice,
                    discountPercentage: discountPercentage || 0,
                    discountAmount: discountAmount || 0,
                    offerTitle: offerTitle || null,
                    offerSource: offerSource || null,
                    applyOffer
                };
            })
        );


        const categorydata = await model.categoryModel.find();
        const branddata = await model.brandModel.find();

        res.json({
            productdata: BestOfferData,
            categorydata,
            branddata,
            totalPages: Math.ceil(totalCount / limit),
            totalResults: totalCount 
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};



const productDetealsPageload = async (req, res) => {
    try {
        const user = req.session.user;
        let cartCount = 0;
        const userId = req.session.user?._id;
        
        if (userId) {
            const userCart = await model.cartModel.findOne({ userId });
            if (userCart && userCart.items.length > 0) {
                cartCount = userCart.items.reduce((acc, item) => acc + item.quantity, 0);
            }
        }
        
        const id = req.params.id;
        const suggestion = await model.productModel.find({});
        const product = await model.productModel.findById(id).populate('categoryId brandId');
        
        if (!product) {
            return res.status(404).send("Product not found");
        }
        
    
        const { finalPrice, discountPercentage, discountAmount, offerTitle, offerSource } = await Best.BestOffer(product);
        
        const applyOffer = !!(offerTitle && discountAmount > 0);
        
        const productWithOffer = {
            ...product.toObject(),
            finalPrice: finalPrice || product.discountPrice,
            discountPercentage: discountPercentage || 0,
            discountAmount: discountAmount || 0,
            offerTitle: offerTitle || null,
            offerSource: offerSource || null,
            applyOffer
        };
        
      
        
        res.render("user/productdetails", { 
            product: productWithOffer, 
            suggestion, 
            cart: cartCount, 
            user 
        });
        
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
};

module.exports = {
    productLoadPage,
    productDetealsPageload,
    productPostPageLoad
}