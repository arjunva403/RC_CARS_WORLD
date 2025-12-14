function check(req, res, next) {
    try{ 
       if(req.session.admin) {
           return next()
       }
        res.redirect("/admin")
    }catch(error){
       console.error(error.message)
        res.status(500).send("Server Error");
    }
  }
  
   function is_login (req,res,next){
     try {
        if(req.session.admin){
           res.redirect("/dashboard")
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