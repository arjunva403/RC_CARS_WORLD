const model = require("../../src/config");
const { uploadCloudnary } = require("../../src/cloudinary");
const fs = require("fs");
const mongoose = require("mongoose");
const { errorMonitor } = require("events");

const productManagePageLoad = async (req, res) => {
  try {

    const searchQuery = req.query.searchQuery || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 3;

    const filter = {
      isDeleted: false,
      productName: { $regex: searchQuery, $options: 'i' },
    };

    const totalProducts = await model.productModel.countDocuments(filter);
    const totalpage = Math.ceil(totalProducts / limit);

    const products = await model.productModel.find(filter)
      .populate('brandId categoryId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render('admin/productmanage', {
      products,
      totalProducts,
      page,
      totalpage,
      searchQuery,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");

  }
};

const addProductPageLoad = async (req, res) => {
  try {
    const brands = await model.brandModel.find();
    const categories = await model.categoryModel.find();
    res.render("admin/addproduct", { brands, categories });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

const editProductPageLoad = async (req, res) => {
  try {
    const product = await model.productModel.findById(req.params.id).populate('brandId categoryId');
    const brands = await model.brandModel.find();
    const categories = await model.categoryModel.find();
    if (!product) return res.status(404).send("Product not found");
    res.render("admin/editproduct", { product, brands, categories });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

const addProduct = async (req, res) => {
  try {
    const { name, brand, category, price, discount, stock, description } = req.body;
    const images = req.files;
    if (Number(discount) >= Number(price)) {
      return res.status(400).send("Discount price must be less than the original price");
    }



    if (!images || images.length < 3) {
      return res.status(400).send("At least 3 images are required");
    }
    if (!mongoose.Types.ObjectId.isValid(brand)) {
      return res.status(400).send("Invalid brand ID");
    }
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).send("Invalid category ID");
    }


    const uploadedImages = await Promise.all(
      images.map(async (image) => {
        try {
          const result = await uploadCloudnary(image.path);
          return result?.url || null;
        } catch (err) {
          console.error('Upload failed for:', image.path, err);
          return null;
        }
      })
    );




    const filteredImages = uploadedImages.filter((url) => url !== null);

    if (filteredImages.length < 3) {
      return res.status(400).send("Failed to upload at least 3 images to Cloudinary");
    }

    const product = new model.productModel({
      productName: name,
      brandId: brand,
      categoryId: category,
      description,
      stock,
      baseprice: price,
      discountPrice: discount,
      images: filteredImages,
      isListed: true,
      isDeleted: false,
    });

    await product.save();
    res.redirect("/products");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};



const editProduct = async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      price,
      discount,
      stock,
      description,
      existingImages = [],
      deletedImages = []
    } = req.body;

    const productId = req.params.id;
    const newImages = req.files || []; 

    if (Number(discount) >= Number(price)) {
      return res.status(400).send("Discount price must be less than the original price");
    }
    const product = await model.productModel.findById(productId);
    if (!product) return res.status(404).send("Product not found");

    
    if (!mongoose.Types.ObjectId.isValid(brand)) {
      return res.status(400).send("Invalid brand ID");
    }
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).send("Invalid category ID");
    }

    
    let finalImages = Array.isArray(existingImages)
      ? existingImages.filter(img => !deletedImages.includes(img))
      : [];

  
    if (newImages.length > 0) {
      const uploadedImages = await Promise.all(
        newImages.map(async (image, index) => {
          const publicId = `products/${productId}_${Date.now()}_${index}`;
          const result = await uploadCloudnary(image.path, publicId);
          return result?.url || null;
        })
      );
      finalImages.push(...uploadedImages.filter(Boolean));
    }

    
  await model.productModel.findByIdAndUpdate(productId, {
  productName: name,
  brandId: brand,
  categoryId: category,
  description,
  stock,
  baseprice: price,
  discountPrice: discount,
  images: finalImages
}, { new: true });

    res.redirect("/products");
  } catch (error) {
    console.error("Edit Product Error:", error.message);
    res.status(500).send("Server Error");
  }
};    

module.exports = { editProduct };


const deleteProduct = async (req, res) => {
  try {
    const product = await model.productModel.findById(req.params.id);
    if (!product) return null
    product.isDeleted = true;
    await product.save();
    res.redirect("/products");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

const islistPageLoad = async (req, res) => {
  try {
    const product = await model.productModel.findById(req.params.id);
    if (!product) return null
    product.isListed = !product.isListed
    await product.save()
    res.redirect("/products");
  } catch (error) {
    console.log(error.message)
    res.status(500).send("Server Error");
  }
}

module.exports = {
  productManagePageLoad,
  addProductPageLoad,
  editProductPageLoad,
  addProduct,
  editProduct,
  deleteProduct,
  islistPageLoad,
};