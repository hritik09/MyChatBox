/*
 * Module dependencies
 */

var express = require('express')
	, redis = require('redis')
	, path = require('path')
	, passport = require('passport')
  , morgan = require('morgan')
  , utils = require('./modules/utils.js')
  , config = require('./config')
	, init = require('./modules/init.js');

var session = require('express-session');
var cookieParser = require('cookie-parser')();
var bodyParser   = require('body-parser');
var sessionstore = require('sessionstore').createSessionStore();
var sessionMiddleware = session({ 
                  secret: config.session.secret, 
                  store: sessionstore
                });
/*
 * Create and config server
 */

var app = exports.app = express();
app.set('config', config);
app.set('redisClient', redis.createClient(config.redis.port,
                config.redis.server, {
                        'auth_pass' : config.redis.password
                })
);
// app.set('redisClient', redis.createClient());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms
app.set('views', path.join(__dirname, 'views/themes/default'));
app.set('view engine', 'jade');

/*
 * Clean db and create folder
 */

init(app.get('redisClient'));

/*
 * Passportjs auth strategy
 */

require('./modules/authentication.js')(app, passport);
// required for passport
app.use(sessionMiddleware); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

/*
 * Routes
 */

require('./modules/route.js')(app, passport);

/*
 * Web server
 */

if(app.get('config').credentials) {
  exports.server = require('https')
  .createServer(app.get('config').credentials, app).listen(config.app.port, function() {
    console.log('MyChatBox with https started on port %d', config.app.port);
  });
} else {
  exports.server = require('http')
  .createServer(app).listen(config.app.port, function() {
    console.log('MyChatBox with http started on port %d', config.app.port);
  });
}

/*
 * Socket.io
 */


require('./modules/sockets')(app, exports.server, sessionMiddleware);


/*
 * Catch uncaught exceptions
 */

// process.on('uncaughtException', function(err){
//   console.log('Exception: ' + err.stack);
// });
