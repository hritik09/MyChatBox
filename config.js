var config = {};
config.app = {};
config.auth = {};
config.redis = {};
config.session = {};
config.theme = {};

config.app.port = 5000;

config.session.secret = "itsNotaSecret";
config.session.age = 0;

config.redis.server = '127.0.0.1';
config.redis.port = 8345;
config.redis.password = 'rediSiSawesomE';

config.auth.twitter = {};
config.auth.facebook = {};
config.auth.github = {};

config.auth.twitter.consumerkey = '';
config.auth.twitter.consumersecret = '';
config.auth.twitter.callback = 'http://127.0.0.1:6666/auth/twitter/callback';

// config.auth.facebook.clientid = '888705577842683';
// config.auth.facebook.clientsecret = '231f8a99f1646e5ac57af74d696b366c';
// config.auth.facebook.callback = 'http://127.0.0.1:6666/auth/facebook/callback';

config.auth.facebook.clientid = '';
config.auth.facebook.clientsecret = '';
config.auth.facebook.callback = 'http://127.0.0.1:6666/auth/facebook/callback';

config.auth.github.clientid = '';
config.auth.github.clientsecret = '';
config.auth.github.callback = 'http://127.0.0.1:6666/auth/github/callback';


module.exports = config;
