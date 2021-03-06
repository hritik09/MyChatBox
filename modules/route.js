
/*
 * Module dependencies
 */

var utils = require('./utils');

/**
 * Expose routes
 */

module.exports = Routes;

/**
 * Defines routes for application
 *
 * @param {Express} app `Express` instance.
 * @api public
 */

function Routes (app, passport) {
  var config = app.get('config');
  var client = app.get('redisClient');
  
  /*
   * Homepage
   */
  app.get('/', function(req, res, next) {
    if(req.isAuthenticated()){
      req.session.user = req.user;
      client.hset(
          'USERS', req.user.id
        , JSON.stringify(req.user)
      );
      res.redirect('/rooms');
    } else{
      res.render('index');
    }
  });


  /*
   * Authentication routes
   */

  if(config.auth.twitter.consumerkey.length) {
    app.get('/auth/twitter', passport.authenticate('twitter'));

    app.get('/auth/twitter/callback', 
      passport.authenticate('twitter', {
        successRedirect: '/',
        failureRedirect: '/'
      })
    );
  }

  if(config.auth.facebook.clientid.length) {
    app.get('/auth/facebook', passport.authenticate('facebook'));

    app.get('/auth/facebook/callback', 
      passport.authenticate('facebook', {
        successRedirect: '/',
        failureRedirect: '/'
      })
    );
  }

  if(config.auth.github.clientid.length) {
    app.get('/auth/github', passport.authenticate('github'));

    app.get('/auth/github/callback', 
      passport.authenticate('github', {
        successRedirect: '/',
        failureRedirect: '/'
      })
    );
  }

  app.get('/login', function(req, res) {
    res.render('login');
  });

  app.get('/signup', function(req, res) {
    res.render('signup');
  });

  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  });

  // process the login form
  app.post('/login', passport.authenticate('local-login', {
      successRedirect : '/', // redirect to the secure profile section
      failureRedirect : '/', // redirect back to the signup page if there is an error
      // failureFlash : true // allow flash messages
  }));

  app.post('/signup', passport.authenticate('local-signup', {
      successRedirect : '/', // redirect to the secure profile section
      failureRedirect : '/', // redirect back to the signup page if there is an error
      // failureFlash : true // allow flash messages
  }));



  /*
   * Rooms list
   */

  app.get('/rooms', utils.restrict, function(req, res) {
    utils.getPublicRoomsInfo(client, function(rooms) {
      res.render('room_list', { rooms: rooms });
    });
  });

  /*
   * Create a rooom
   */

  app.post('/create', utils.restrict, function(req, res) {
    utils.validRoomName(req, res, function(roomKey) {
      utils.roomExists(req, res, client, function() {
        utils.createRoom(req, res, client);
      });
    });
  });

  /*
   * Join a room
   */

  app.get('/:id', utils.restrict, function(req, res) {
    utils.getRoomInfo(req, res, client, function(room) {
      utils.getUsersInRoom(req, res, client, room, function(users) {
        utils.getPublicRoomsInfo(client, function(rooms) {
          utils.getUserStatus(req.user, client, function(status) {
            utils.enterRoom(req, res, room, users, rooms, status);
          });
        });
      });
    });
  });

     // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

       // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/', // redirect to the secure profile section
        failureRedirect : '/', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));


}
