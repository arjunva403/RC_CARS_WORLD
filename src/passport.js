const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const model = require("./config"); // adjust path if needed
require("dotenv").config();

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:4003/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const fullName = profile.displayName.trim();
      const [firstName, ...rest] = fullName.split(" ");
      const lastName = rest.join(" ");

      let user = await model.usersModel.findOne({ googleId: profile.id });

      if (user) {
        console.log(" User found via Google ID");
        return done(null, user);
      }

      const existingEmailUser = await model.usersModel.findOne({ email: profile.emails[0].value });

      if (existingEmailUser) {
        console.log("Email already used with another account");
        return done(null, false, { message: "Email already in use" });
      }

      const newUser = new model.usersModel({
        firstName,
        lastName,
        email: profile.emails[0].value,
        googleId: profile.id,
        isBlocked: false,
      });

      await newUser.save();
      console.log(" New user created via Google:", newUser.email);
      return done(null, newUser);

    } catch (error) {
      console.error("Error in Google strategy:", error);
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  model.usersModel.findById(id)
    .then(user => done(null, user))
    .catch(err => done(err, null));
});

module.exports = passport;
