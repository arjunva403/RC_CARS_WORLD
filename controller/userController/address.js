const model = require("../../src/config")


const manageAddressPageLoad = async (req, res) => {
  try {
    const userId = req.session.user?._id
    const address = await model.addressModel.find({ userId })
    res.render("user/manageaddress", { address })
  } catch (error) {
    console.error(error.message)
    res.status(500).send("Server Error");
  }
}

const addAddresspageLoad = async (req, res) => {
  try {
    res.render("user/AddAddress")
  } catch (error) {
    console.error(error.message)
    res.status(500).send("Server Error");
  }
}

const addAddressPostMethord = async (req, res) => {
  try {
    const newAddress = req.body;
    const userId = req.session.user?._id;
    console.log(newAddress)
    if (!newAddress.name) {
      return res.json({ error: "pleas enter the name" })
    }
    if (!newAddress.phoneNumber) {
      return res.json({ error: "pleas enter the Phone Number" })
    }
    if (newAddress.phoneNumber.length !== 10) {
      return res.json({ error: "Phone number must be exactly 10 digits" });
    }
    if (!userId) {
      return res.status(401).json({ error: "User not logged in" });
    }

    if (!newAddress.altPhoneNumber) {
      return res.json({ error: "pleas enter the altPhoneNumber" })
    }
    if (newAddress.altPhoneNumber.length !== 10) {
      return res.json({ error: "altPhone number must be exactly 10 digits" });
    }
    if (!newAddress.pincode) {
      return res.json({ error: "pleas enter the pincode" })
    }
    if (newAddress.pincode.length !== 6) {
      return res.json({ error: "Pincode must be exactly 6 digits" });
    }
    if (!newAddress.locality) {
      return res.json({ error: "pleas enter your locality" })
    }
    if(!newAddress.houseNo){
       return res.json({ error: "pleas enter your houseNumber" });
    }
    if(!newAddress.landMark){
       return res.json({ error: "pleas enter your landMark" });
    }
    if(!newAddress.state){
       return res.json({ error: "pleas enter selete  your state" });
    }
    if(!newAddress.city){
       return res.json({ error: "pleas enter your city" });
    }
    if(!newAddress.addressType){
       return res.json({ error: "pleas enter your AddressType " });

    }
    const userData = await model.usersModel.findOne({ _id: userId, isBlocked: false });
    if (userData) {
      await model.addressModel.findOneAndUpdate(
        { userId: userId },
        { $push: { address: newAddress } },
        { upsert: true, new: true }
      );

      return res.json({ success: true, message: "Address added successfully" });
    } else {
      return res.status(403).json({ error: "User not found or blocked" });
    }

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ error: "Server Error" });
  }
};



const editaddressPageLoad = async (req, res) => {
  try {
    const addressId = req.params.id;
    const user = req.session.user?._id;


    const addressData = await model.addressModel.findOne(
      { userId: user, "address._id": addressId },
      { "address.$": 1 }
    );

    if (!addressData || !addressData.address || addressData.address.length === 0) {
      return res.redirect("/manageadd");
    }

    const address = addressData.address[0];
    res.render("user/editeaddress", { address });

  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong.");
  }
};


const posteditAddress = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addressId = req.params.id;
    const {
      name,
      phoneNumber,
      altPhoneNumber,
      pincode,
      locality,
      houseNo,
      landMark,
      state,
      city,
      addressType
    } = req.body;

    const updated = await model.addressModel.updateOne(
      { userID: userId, "address._id": addressId },
      {
        $set: {
          "address.$.name": name,
          "address.$.phoneNumber": phoneNumber,
          "address.$.altPhoneNumber": altPhoneNumber,
          "address.$.pincode": pincode,
          "address.$.locality": locality,
          "address.$.houseNo": houseNo,
          "address.$.landMark": landMark,
          "address.$.state": state,
          "address.$.city": city,
          "address.$.addressType": addressType
        }
      }
    );

    res.json({ success: true });

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.user?._id;
    console.log(addressId)
    if (!userId || !addressId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const result = await model.addressModel.updateOne(
      { userId },
      { $pull: { address: { _id: addressId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Address not found or already deleted" });
    }

    res.json({ success: true, message: "Address deleted successfully" });

  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
}
module.exports = {
  manageAddressPageLoad,
  editaddressPageLoad,
  addAddresspageLoad,
  addAddressPostMethord,
  posteditAddress,
  deleteAddress
}