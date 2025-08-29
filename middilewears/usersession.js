function check(req, res, next) {
    try{ 
       if(req.session.user) {
           return next()
       }
        res.redirect("/")
    }catch(error){
       console.error(error.message)
        res.status(500).send("Server Error");
    }
  }

 function is_login (req,res,next){
   try {
      if(req.session.user){
         res.redirect("/profile")
      }else{
         next()
      }
   } catch (error) {
      console.error(error.message)
       res.status(500).send("Server Error");
   }
 } 
 
  module.exports = {
     check,
     is_login
  }