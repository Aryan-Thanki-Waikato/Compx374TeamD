// Import required modules
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const User = require("../models/user.model");
const db = require("../models/db");
const domains = require("../config/validDomains");
const jwt = require("jsonwebtoken");

// CHANGE VISIBILY / PERMISSIONS TO THESE LATER
const CLIENT_ID =
  "1037857344941-iba1om7sfqec5jtkhea0jav89115j721.apps.googleusercontent.com";
const CLIENT_SECRET = "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";

module.exports = (passport, res) => {
  // Connect to google cloud through passport
  passport.use(
    new GoogleStrategy(
      {
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/callback",
        passReqToCallback: true,
      },

      async (request, accessToken, refreshToken, profile, done) => {
        try {
          // Check if a user with the Google ID exists in the MySQL database
          db.query(
            "SELECT * FROM Users WHERE googleID=?",
            profile.id,
            (err, results) => {
              if (err) {
                console.error(err);
              } else {
                if (results.length === 1) {
                  // Get User
                  const user = results[0];

                  // Generate token from user information
                  const token = jwt.sign(
                    { userId: user.userID, googleId: user.googleID },
                    "F97B29208433F86C7C354EC45F6D8D0D347F774998C6681F14A13DB8D158ED7C"
                  );

                  // Attach the token to the request object
                  request.token = token;

                  // Return user via jwt
                  return done(null, token);
                } else {
                  // Get user email to check if account can be created
                  let userDomain = profile.emails[0].value.split("@")[1];

                  if (domains.DOMAINS.includes(userDomain)) {
                    // if user does not exist create a new user
                    console.log("Creating new user...");

                    // Split display name for fname/lname
                    const names = profile.displayName.split(" ");

                    // Create a new user from profile information
                    const newUser = new User({
                      googleID: profile.id,
                      fname: names[0],
                      lname: names[1],
                      profilePicture: profile.picture,
                      roles: "Student",
                    });

                    // Execute insertion
                    User.createUser(newUser, (err, data) => {
                      if (err) {
                        // Handle the error
                        console.error("Error:", err);
                        // Send an error response if needed
                      } else {
                        // Handle the success case
                        console.log("User created successfully:", data);
                        // Send a success response if needed
                      }
                    });

                    // If a new user is created, generate a JWT for them
                    const token = jwt.sign(
                      { userID: newUser.userID, googleID: newUser.googleID },
                      "F97B29208433F86C7C354EC45F6D8D0D347F774998C6681F14A13DB8D158ED7C"
                    );

                    // Attach the token to the request object
                    request.token = token;

                    return done(null, token);
                  } else {
                    // User domain isnt correct
                    return done(null, false);
                  }
                }
              }
            }
          );
        } catch (error) {
          console.error("Error:", error);
          return done(error, false);
        }
      }
    )
  );
};
