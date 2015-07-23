
/*
 * Module dependencies
 */
var bcrypt   = require('bcrypt-nodejs');
var TwitterStrategy = require('passport-twitter').Strategy
  , FacebookStrategy = require('passport-facebook').Strategy
  , LocalStrategy   = require('passport-local').Strategy
  , GitHubStrategy = require('passport-github').Strategy;

/**
 * Expose Authentication Strategy
 */

module.exports = Strategy;

/*
 * Defines Passport authentication
 * strategies from application configs
 *
 * @param {Express} app `Express` instance.
 * @api public
 */

function Strategy (app, passport) {
  var config = app.get('config');
  var client = app.get('redisClient');

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        client.hget('User' ,id, function(err, user) {
            done(err, JSON.parse(user));
        });
    });

  if(config.auth.twitter.consumerkey.length) {
    passport.use(new TwitterStrategy({
        consumerKey: config.auth.twitter.consumerkey,
        consumerSecret: config.auth.twitter.consumersecret,
        callbackURL: config.auth.twitter.callback
      },
      function(token, tokenSecret, profile, done) {
        return done(null, profile);
      }
    ));
  } 

  if(config.auth.facebook.clientid.length) {
    passport.use(new FacebookStrategy({
        clientID: config.auth.facebook.clientid,
        clientSecret: config.auth.facebook.clientsecret,
        callbackURL: config.auth.facebook.callback
      },
      function(accessToken, refreshToken, profile, done) {
        return done(null, profile);
      }
    ));
  }

  if(config.auth.github.clientid.length) {
    passport.use(new GitHubStrategy({
        clientID: config.auth.github.clientid,
        clientSecret: config.auth.github.clientsecret,
        callbackURL: config.auth.github.callback
      },
      function(token, tokenSecret, profile, done) {
        return done(null, profile);
      }
    ));
  }

  // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        client.hget('User' ,id, function(err, user) {
            done(err, JSON.parse(user));
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {

        // asynchronous
        // User.findOne wont fire unless data is sent back
        process.nextTick(function() {

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            client.get('mychat'+email, function(err, id) {
                // if there are any errors, return the error
                if (err)
                    return done(err);

                // check to see if theres already a user with that email
                if (id) {
                    return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                } else {

                    // if there is no user with that email
                    // create the user
                    var newUser            = {};
                    newUser.local          = {};

                    // set the user's local credentials
                    newUser.local.email    = email;
                    newUser.local.password = generateHash(password);

                    client.incr('mychatsequence', function(err, id) {
                        // save the user
                        client.set('mychat'+email, id,function(err) {
                            newUser.id = id;
                            client.hset('User', id, JSON.stringify(newUser), function(err, reply) {
                                if (err)
                                    throw err;
                                return done(null, newUser);
                            });
                        });
                    });
                    
                }

            });    

        });

    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) { // callback with email and password from our form
            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            client.get('mychat'+email, function(err, id) {
                // if there are any errors, return the error
                if (err)
                    return done(err);

                // check to see if theres already a user with that email
                if (id) {
                    client.hget('User' ,id, function(err, userJson) {
                        var user = JSON.parse(userJson);
                        // if there are any errors, return the error before anything else
                        if (err)
                            return done(err);

                        // if no user is found, return the message
                        if (!user)
                            return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash

                        // if the user is found but the password is wrong
                        if (!validPassword(password, user.local.password))
                            return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata

                        // all is well, return successful user
                        return done(null, user);
                    });
                }
            });

    }));

}

function generateHash (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

function validPassword(password, stroredPass) {
    return bcrypt.compareSync(password, stroredPass);
};


