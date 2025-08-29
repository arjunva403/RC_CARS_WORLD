const { json } = require("express-cookie/lib/response");
const model = require("../../src/config")

const offerPageLoad = async (req, res) => {
    try {
        const product = await model.productModel.find({
            isDeleted: false,
            isListed: true,
        });
        const catageries = await model.categoryModel.find({ visibility: "active" })
        const brands = await model.brandModel.find({ isListed: true })

        const offers = await model.offerModle
            .find()
            .populate('productId', 'productName _id');

        const formattedOffers = offers.map(offer => ({
            ...offer.toObject(),
            formattedStartDate: offer.startDate.toISOString().split('T')[0],
            formattedEndDate: offer.endDate.toISOString().split('T')[0],
            displayStartDate: offer.startDate.toLocaleDateString(),
            displayEndDate: offer.endDate.toLocaleDateString(),
            status: new Date(offer.endDate) > new Date() ? 'active' : 'inactive'
        }))
        const categoriesOffers = await model.categoryOffer.find().populate("categoryId")
        const categoryOffers = categoriesOffers.map(offer => ({
            ...offer.toObject(),
            formattedStartDate: offer.startDate.toISOString().split('T')[0],
            formattedEndDate: offer.endDate.toISOString().split('T')[0],
            displayStartDate: offer.startDate.toLocaleDateString(),
            displayEndDate: offer.endDate.toLocaleDateString(),
            status: new Date(offer.endDate) > new Date() ? 'active' : 'inactive'
        }))

        const brandsOffers = await model.brandOffer.find().populate("brandId")
        const brandOffers = brandsOffers.map(offer => ({
            ...offer.toObject(),
            formattedStartDate: offer.startDate.toISOString().split('T')[0],
            formattedEndDate: offer.endDate.toISOString().split('T')[0],
            displayStartDate: offer.startDate.toLocaleDateString(),
            displayEndDate: offer.endDate.toLocaleDateString(),
            status: new Date(offer.endDate) > new Date() ? 'active' : 'inactive'
        }))

        res.render('admin/offers', { product, catageries, brands, offers: formattedOffers, categoryOffers, brandOffers });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};


const offerPost = async (req, res) => {
    try {
        const { title, productID, discount, startDate, endDate } = req.body
        if (!title) {
            return res.json({ fail: "title not entered" })
        }
        if (!productID) {
            return res.json({ fail: "product not seleted" })
        }
        if (!discount) {
            return res.json({ fail: "discount not enterd" })
        }
        if (!startDate) {
            return res.json({ fail: "enter your Offer Starting Date" })
        }
        if (!endDate) {
            return res.json({ fail: "enter your Offer Ending Date" })
        }

        if (discount <= 0 || discount > 100) {
            return res.json({ fail: "Discount must be between 1-100%" })
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            return res.json({ fail: "End date must be after start date" })
        }
        const newOffer = await model.offerModle({
            title: title,
            productId: productID,
            discount: discount,
            status: "active",
            startDate: start,
            endDate: end
        })

        await newOffer.save()
        return res.json({ success: "its done" })
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
}

const updateOffer = async (req, res) => {
    try {
        const offerId = req.params.id
        const { title, productID, discount, startDate, endDate } = req.body
        if (!offerId) {
            return res.json({ fail: "id is not there" })
        }
        if (!title) {
            return res.json({ fail: "title is not entered" })
        }
        if (!productID) {
            return res.json({ fail: "productID is not entered" })
        }
        if (!discount) {
            return res.json({ fail: "discount is not entered" })
        }
        if (!startDate) {
            return res.json({ fail: "startDate is not entered" })
        }
        if (!endDate) {
            return res.json({ fail: "endDate is not entered" })
        }
        if (discount <= 0 || discount > 100) {
            return res.json({ fail: "Discount must be between 1-100%" })
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            return res.json({ fail: "End date must be after start date" })
        }

        const updatedOffer = await model.offerModle.findByIdAndUpdate(
            { _id: offerId },
            {
                title,
                productId: productID,
                discount,
                status: "active",
                startDate: start,
                endDate: end
            },
            { new: true }
        )

        if (!updatedOffer) {
            return res.status(404).json({ fail: "Offer not found" });
        }


        res.status(200).json({ success: "Offer updated successfully", offer: updatedOffer });



    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
}

const deleteOffer = async (req, res) => {
    try {
        const offerID = req.params.id;

        if (!offerID) {
            return res.status(400).json({ fail: "Offer ID is required" });
        }

        const deleted = await model.offerModle.findByIdAndDelete({ _id: offerID });
        if (!deleted) {
            return res.status(404).json({ fail: "Offer not found" });
        }

        res.json({ success: true, message: "Offer deleted successfully" });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
};


const brandOffer = async (req, res) => {
    try {
        const { title, brandID, discount, startDate, endDate } = req.body
        if (!title) {
            return res.json({ fail: "title not entered" })
        }
        if (!brandID) {
            return res.json({ fail: "brand not seleted" })
        }
        if (!discount) {
            return res.json({ fail: "discount not enterd" })
        }
        if (!startDate) {
            return res.json({ fail: "enter your Offer Starting Date" })
        }
        if (!endDate) {
            return res.json({ fail: "enter your Offer Ending Date" })
        }

        if (discount <= 0 || discount > 100) {
            return res.json({ fail: "Discount must be between 1-100%" })
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            return res.json({ fail: "End date must be after start date" })
        }
        const newOffer = await model.brandOffer({
            title: title,
            brandId: brandID,
            discount: discount,
            status: "active",
            startDate: start,
            endDate: end
        })

        await newOffer.save()
        return res.json({ success: "its done" })


    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
}

const updateBrandOffer = async (req,res) => {
    try {
        const offerId = req.params.id
        const { title, brandID, discount, startDate, endDate } = req.body
        if (!offerId) {
            return res.json({ fail: "id is not there" })
        }
        if (!title) {
            return res.json({ fail: "title is not entered" })
        }
        if (!brandID) {
            return res.json({ fail: "brandID is not entered" })
        }
        if (!discount) {
            return res.json({ fail: "discount is not entered" })
        }
        if (!startDate) {
            return res.json({ fail: "startDate is not entered" })
        }
        if (!endDate) {
            return res.json({ fail: "endDate is not entered" })
        }
        if (discount <= 0 || discount > 100) {
            return res.json({ fail: "Discount must be between 1-100%" })
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            return res.json({ fail: "End date must be after start date" })
        }

        const updatedOffer = await model.brandOffer.findByIdAndUpdate(
            { _id: offerId },
            {
                title,
                brandId: brandID,
                discount,
                status: "active",
                startDate: start,
                endDate: end
            },
            { new: true }
        )

        if (!updatedOffer) {
            return res.status(404).json({ fail: "Offer not found" });
        }


        res.status(200).json({ success: "Offer updated successfully", offer: updatedOffer });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error"); 
    }
}

const deleteBrandOffer = async (req, res) => {
    try {
        const offerID = req.params.id;

        if (!offerID) {
            return res.status(400).json({ fail: "Offer ID is required" });
        }

        const deleted = await model.brandOffer.findByIdAndDelete({ _id: offerID });
        if (!deleted) {
            return res.status(404).json({ fail: "Offer not found" });
        }

        res.json({ success: true, message: "Offer deleted successfully" });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
};

const catagoryoffer = async (req, res) => {
    try {
        const { title, categoryID, discount, startDate, endDate } = req.body
        if (!title) {
            return res.json({ fail: "title not entered" })
        }
        if (!categoryID) {
            return res.json({ fail: "catagory not seleted" })
        }
        if (!discount) {
            return res.json({ fail: "discount not enterd" })
        }
        if (!startDate) {
            return res.json({ fail: "enter your Offer Starting Date" })
        }
        if (!endDate) {
            return res.json({ fail: "enter your Offer Ending Date" })
        }

        if (discount <= 0 || discount > 100) {
            return res.json({ fail: "Discount must be between 1-100%" })
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            return res.json({ fail: "End date must be after start date" })
        }
        const newOffer = await model.categoryOffer({
            title: title,
            categoryId: categoryID,
            discount: discount,
            status: "active",
            startDate: start,
            endDate: end
        })

        await newOffer.save()
        return res.json({ success: "its done" })

    } catch (error) {
      console.error(error.message);
        res.status(500).send("Server Error");
    }
}

const updateCatagoryOffer = async (req,res) => {
    try {
        const offerId = req.params.id
        const { title, categoryID, discount, startDate, endDate } = req.body
        if (!offerId) {
            return res.json({ fail: "id is not there" })
        }
        if (!title) {
            return res.json({ fail: "title is not entered" })
        }
        if (!categoryID) {
            return res.json({ fail: "categoryID is not entered" })
        }
        if (!discount) {
            return res.json({ fail: "discount is not entered" })
        }
        if (!startDate) {
            return res.json({ fail: "startDate is not entered" })
        }
        if (!endDate) {
            return res.json({ fail: "endDate is not entered" })
        }
        if (discount <= 0 || discount > 100) {
            return res.json({ fail: "Discount must be between 1-100%" })
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            return res.json({ fail: "End date must be after start date" })
        }

        const updatedOffer = await model.categoryOffer.findByIdAndUpdate(
            { _id: offerId },
            {
                title,
                categoryId: categoryID,
                discount,
                status: "active",
                startDate: start,
                endDate: end
            },
            { new: true }
        )

        if (!updatedOffer) {
            return res.status(404).json({ fail: "Offer not found" });
        }


        res.status(200).json({ success: "Offer updated successfully", offer: updatedOffer });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error"); 
    }
}
const deleteCategoryOffer = async (req, res) => {
    try {
        const offerID = req.params.id;
      
        if (!offerID) {
            return res.status(400).json({ fail: "Offer ID is required" });
        }

        const deleted = await model.categoryOffer.findByIdAndDelete({ _id: offerID });
        if (!deleted) {
            return res.status(404).json({ fail: "Offer not found" });
        }

        res.json({ success: true, message: "Offer deleted successfully" });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Server Error");
    }
};
module.exports = {
    offerPageLoad,
    offerPost,
    updateOffer,
    deleteOffer,
    brandOffer,
    catagoryoffer,
    updateBrandOffer,
    updateCatagoryOffer,
    deleteCategoryOffer,
    deleteBrandOffer,
}