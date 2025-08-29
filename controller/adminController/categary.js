const model = require("../../src/config")

const categoryPageLoad = async (req, res) => {
    try {
      const searchQuery = req.query.searchQuery || '';
      const page = parseInt(req.query.page) || 1;
      const limit = 3;
  
      const filter = {
        categoryName: { $regex: searchQuery, $options: 'i' },
      };
  
      const totalcategory = await model.categoryModel.countDocuments(filter);
      const totalpage = Math.ceil(totalcategory / limit);
  
      const categories = await model.categoryModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
  
      res.render('admin/catagories', {
        categories,
        totalcategory,
        page,
        totalpage,
        searchQuery,
      });
    } catch (error) {
      console.error( error.message);
       res.status(500).send("Server Error");
      
    }
  };
const postcategoryPageLoad = async (req, res) => {
    try {
        const newName = req.body.addname?.trim();

        
        if (!newName) {
            return res.status(400).json({ success: false, error: 'Category name is required' });
        }

        
        const existing = await model.categoryModel.findOne({
            categoryName: { $regex: new RegExp(`^${newName}$`, 'i') }
        });

        if (existing) {
            return res.status(400).json({ success: false, error: 'Category already exists' });
        }

        
        const newCategory = new model.categoryModel({
            categoryName: newName,
            visibility: 'active'
        });

        await newCategory.save();
        return res.json({ success: true, message: 'Category added successfully' });

    } catch (error) {
         console.error(error.message)
         res.status(500).send("Server Error");
    }
};


const listAndUnlistPageload = async (req, res) => {
    try {
        const catagoryid = req.params.categoryid
      
        if (catagoryid) {
            const catagoriesid = await model.categoryModel.findById(catagoryid)
            catagoriesid.visibility = catagoriesid.visibility === "active" ? "inActive" : "active";
            await catagoriesid.save()
            return res.json({ success: true });

        }
       

    } catch (error) {
        console.error(error.message)
         res.status(500).send("Server Error");

    }
}

const editcategoryPageLoad = async (req, res) => {
    try {
        const editcategory = req.body.edit?.trim();
        const editid = req.body.cateid;

        if (!editcategory) {
            return res.status(400).json({ success: false, error: 'Category name is required' });
        }

        const existing = await model.categoryModel.findOne({
            categoryName: { $regex: new RegExp(`^${editcategory}$`, 'i') }
        });

        
        if (existing && existing._id.toString() !== editid) {
            return res.status(400).json({ success: false, error: 'Category already exists' });
        }

        const edited = await model.categoryModel.findOneAndUpdate(
            { _id: editid },
            { categoryName: editcategory },
            { new: true }
        );

        if (!edited) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }

        return res.json({ success: true, message: 'Category updated successfully', category: edited });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

module.exports = {
    categoryPageLoad,
    postcategoryPageLoad,
    listAndUnlistPageload,
    editcategoryPageLoad,
}