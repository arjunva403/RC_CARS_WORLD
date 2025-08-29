const model = require ("../../src/config")


const brandPageLoad = async (req, res) => {
  try {
    const searchQuery = req.query.searchQuery || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 3;

    const filter = {
      brandName: { $regex: searchQuery, $options: 'i' },
    };

    const totalBrands = await model.brandModel.countDocuments(filter);
    const totalpage = Math.ceil(totalBrands / limit);

    const brands = await model.brandModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.render('admin/brands', {
      brands,
      totalBrands,
      page,
      totalpage,
      searchQuery,
    });
  } catch (error) {
    console.error( error.message);
     res.status(500).send("Server Error");
  }
}


const addbrandAndeditPageLoad = async (req,res) => {
    try {
        const brandname = req.body.brandName
        const editid = req.body.editid
        const editname = req.body.editname

         if (!brandname) {
            return res.status(400).json({ success: false, error: 'brand name is required' });
        }

         const existing = await model.brandModel.findOne({
                    brandName: { $regex: new RegExp(`^${newName}$`, 'i') }
                });

           const newbrand = new model.brandModel({
                      brandName: newName,
                      visibility: 'active'
                  });

     await newbrand.save();
        res.json({ success: true, message: 'brand added successfully' });

      if(editid&&editname){
        const brandupdate = await model.brandModel.findByIdAndUpdate(
            {_id:editid},
            {brandName:editname},
            {new:true}
        )
        await brandupdate.save()
        return res.json({completed:"its succuss"})
      }




    } catch (error) {
        console.error(error.message)
         res.status(500).send("Server Error");
    }
}

const listAndUnlistedPageLoad = async (req,res) => {
    try {
        const brandId = req.params.brandId
        const brandData = await model.brandModel.findById(brandId)
       brandData.isListed = !brandData.isListed
       await brandData.save()
       return res.json({success:"its oky"})
       
    } catch (error) {
        console.error(error.message)
         res.status(500).send("Server Error");
    }
}



module.exports = {
    brandPageLoad,
    addbrandAndeditPageLoad,
    listAndUnlistedPageLoad,
}