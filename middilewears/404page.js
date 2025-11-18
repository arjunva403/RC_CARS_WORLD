const notExistedPageLoadError = async (req,res,next) => {
    try {
        res.status(404).render("user/404page")
    } catch (error) {
      console.error(error.message) 
    }
}


module.exports = notExistedPageLoadError