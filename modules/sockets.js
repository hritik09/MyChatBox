
/*
 * Module dependencies
 */

var sio = require('socket.io');
var fs = require('fs');

/**
 * Expose Sockets initialization
 */

module.exports = Sockets;

/**
 * Socket.io
 *
 * @param {Express} app `Express` instance.
 * @param {HTTPServer} server `http` server instance.
 * @api public
 */

function Sockets (app, server, sharedsession, sessionMiddleware) {
  var config = app.get('config');
  var client = app.get('redisClient');

  var io = sio.listen(server);
  io.use(sharedsession(sessionMiddleware, {
    autoSave:true
  }));
  // io.set('authorization', function (hsData, accept) {
  //   if(hsData.headers.cookie) {
  //     var cookies = parseCookies(cookie.parse(hsData.headers.cookie), config.session.secret)
  //       , sid = cookies['mychatbox'];

  //     sessionstore.load(sid, function(err, session) {
  //       if(err || !session) {
  //         return accept('Error retrieving session!', false);
  //       }

  //       hsData.mychatbox = {
  //         user: session.passport.user,
  //         room: /\/(?:([^\/]+?))\/?$/g.exec(hsData.headers.referer)[1]
  //       };
  //       console.log(hsData.mychatbox);
  //       return accept(null, true);
        
  //     });
  //   } else {
  //     return accept('No cookie transmitted.', false);
  //   }
  // });


  io.sockets.on('connection', function (socket) {
    console.log('new connection');
    var session = socket.handshake.session
      // , nickname = hs.mychatbox.user.username
      // , provider = hs.mychatbox.user.provider
      , nickname = session.user.local.email
      , userKey = session.user.id
      , room_id = session.room.key
      , now = new Date()
      // Chat Log handler
      , chatlogFileName = './chats/' + room_id + (now.getFullYear()) + (now.getMonth() + 1) + (now.getDate()) + ".txt"
      //, chatlogWriteStream = fs.createWriteStream(chatlogFileName, {'flags': 'a'});

    socket.join(room_id);
    //console.log("session: "+JSON.stringify(socket.handshake.session));

    client.sadd('sockets:for:' + userKey + ':at:' + room_id, socket.id, function(err, socketAdded) {
      if(socketAdded) {
        client.sadd('socketio:sockets', socket.id);
        client.sadd('rooms:' + room_id + ':online', userKey, function(err, userAdded) {
          if(userAdded) {
            client.hincrby('rooms:' + room_id + ':info', 'online', 1);
            client.get('users:' + userKey + ':status', function(err, status) {
              io.sockets.in(room_id).emit('new user', {
                nickname: nickname,
                status: status || 'available'
              });
            });
          }
        });
      }
    });

    socket.on('my msg', function(data) {
      var no_empty = data.msg.replace("\n","");
      if(no_empty.length > 0) {
        var chatlogRegistry = {
          type: 'message',
          from: userKey,
          atTime: new Date(),
          withData: data.msg
        }

         //chatlogWriteStream.write(JSON.stringify(chatlogRegistry) + "\n");
        
        io.sockets.in(room_id).emit('new msg', {
          nickname: nickname,
          msg: data.msg
        });        
      }   
    });

    socket.on('set status', function(data) {
      var status = data.status;

      client.set('users:' + userKey + ':status', status, function(err, statusSet) {
        io.sockets.emit('user-info update', {
          username: nickname,
          status: status
        });
      });
    });

    socket.on('history request', function() {
      var history = [];
      var tail = require('child_process').spawn('tail', ['-n', 5, chatlogFileName]);
      tail.stdout.on('data', function (data) {
        var lines = data.toString('utf-8').split("\n");
        
        lines.forEach(function(line, index) {
          if(line.length) {
            var historyLine = JSON.parse(line);
            history.push(historyLine);
          }
        });

        socket.emit('history response', {
          history: history
        });
      });
    });

    socket.on('disconnect', function() {
      // 'sockets:at:' + room_id + ':for:' + userKey
      client.srem('sockets:for:' + userKey + ':at:' + room_id, socket.id, function(err, removed) {
        if(removed) {
          client.srem('socketio:sockets', socket.id);
          client.scard('sockets:for:' + userKey + ':at:' + room_id, function(err, members_no) {
            if(!members_no) {
              client.srem('rooms:' + room_id + ':online', userKey, function(err, removed) {
                if (removed) {
                  client.hincrby('rooms:' + room_id + ':info', 'online', -1);
                  // chatlogWriteStream.destroySoon();
                  io.sockets.in(room_id).emit('user leave', {
                    nickname: nickname,
                  });
                }
              });
            }
          });
        }
      });
    });
  });

};