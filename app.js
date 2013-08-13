
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    connect = require('./routes/connect.js'),
    rem = require('rem');

var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(process.env.COOKIE_SECRET));
  app.use(express.session({secret: process.env.SECRET}));
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

var twitter = rem.connect('twitter.com').configure({
  key: 'vsItuzcxhJUP3jMqOL0Q',
  secret: 'ZGh3GeRe8x2m4GvqW1Rm7opuAGQSPpYNk5g6nL9ZTE'
});

var facebook = rem.connect('facebook.com').configure({
  key: process.env.FACEBOOK_KEY,
  secret: process.env.FACEBOOK_SECRET
});

var tw_oauth = rem.oauth(twitter, 'http://localhost:3000/oauth/twitter');
var fb_oauth = rem.oauth(facebook, 'http://localhost:3000/oauth/facebook');

app.get('/login/twitter/', tw_oauth.login());
app.get('/login/facebook/', fb_oauth.login());
app.get('/connect/twitter/', tw_oauth.login());
app.get('/connect/facebook/', fb_oauth.login());

//should add support for more than two social media outlets eventually
app.use(tw_oauth.middleware(function (req, res, next) {
  console.log("The user is now authenticated.");
  if (!req.session.user) {
    res.redirect('/');
  } else {
    console.log('Connect facebook.');
    res.redirect('/tw_connect');
  }
}));

//should add support for more than two social media outlets eventually
app.use(fb_oauth.middleware(function (req, res, next) {
  console.log("The user is now authenticated.");
  if (!req.session.user) {
    res.redirect('/');
  } else {
    console.log('Connect twitter.');
    res.redirect('/fb_connect');
  }
}));


// Save the user session as req.user.
app.all('/*', function (req, res, next) {
  req.twitter = tw_oauth.session(req);
  req.facebook = fb_oauth.session(req);
  console.log('app.all - req.facebook: ', req.facebook)
  console.log('app.all - req.twitter: ', req.twitter)
  next();
});


/**
 * Routes
 */

function loginRequired (req, res, next) {
  if (!req.twitter && !req.facebook) {
    console.log('User must log in');
    res.redirect('/');
  } else {
    console.log('Facebook: ', req.facebook);
    console.log('Twitter: ', req.twitter);
    next();
  }
}

app.get('/', routes.index);


app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

