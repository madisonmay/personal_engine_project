
/**
 * Module dependencies.
 */

Query = {}

var express = require('express'),
    config = require('./config.js'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    request = require('request'),
    google = require('google'),
    passport = require('passport'),
    util = require('util'),
    GoogleStrategy = require('passport-google').Strategy,
    images = require('google-images'),
    connect = require('./routes/connect.js'),
    search = require('./routes/search.js'),
    mongoose = require('mongoose'),
    querystring = require('querystring'),
    inbox = require('inbox'),
    rem = require('rem'),
    models = require('./models/models.js');

var app = module.exports = express.createServer();
var User = models.User;

mongoose.connect((process.env.MONGOLAB_URI||'mongodb://localhost/pep'));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier and profile), and invoke a
//   callback with a user object.
passport.use(new GoogleStrategy({
    returnURL: 'http://localhost:3000/auth/google/return',
    realm: 'http://localhost:3000/'
  },
  function(identifier, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's Google profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Google account with a user record in your database,
      // and return that user instead.
      profile.identifier = identifier;
      console.log("Profile:", profile);
      User.findOne({google_id: identifier}, function(err, db_user) {
        if (db_user) {
          return done(null, db_user);
        } else {
          var new_user = User({'first_name': profile.name.givenName, 'last_name':profile.name.familyName,
                               'gmail': profile.emails[0].value, google_id: profile.identifier});

          new_user.save(function(err, new_user) {
            if (err) {
              console.log(err);
            } else {
              return done(null, new_user);
            }
          });
        }
      })
    });
  }
));

// Configuration
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('base_url', 'http://localhost:3000')
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(process.env.COOKIE_SECRET));
  app.use(express.session({secret: process.env.SECRET}));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(function(req, res, next) {
      console.log("Signed cookies:", req.signedCookies);
      console.log("Cookies:", req.cookies)
      if (req.cookies && 'google_id' in req.cookies) {
        if (!req.user) {
          console.log("URL:", req.url)
          if (req.url.substr(0, 12) != '/auth/google') {
            res.redirect('/auth/google');
          } else {
            next();
          }
        } else {
          next();
        }
      } else if (req.user && req.user.google_id) {
        res.cookie('google_id', req.user.google_id);
        next();
      } else {
        next();
      }
  });
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/search', search.search);
app.post('/refresh', search.refresh);
app.post('/bayes', search.bayesUpdate);
app.get('/register', connect.register);
app.post('/users', connect.addUser);

// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve redirecting
//   the user to google.com.  After authenticating, Google will redirect the
//   user back to this application at /auth/google/return
app.get('/auth/google', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/');
  }
);

// GET /auth/google/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/return', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  }
);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/google', function(req, res) {
  req.session.q = req.query.q;
  req.session.reload(console.log);
  if (req.user) {
    res.redirect(process.env.AUTH_URL); 
  } else {
    res.redirect('/auth/google');
  }
})

function gmail(req, res, code) {
  request.post('https://accounts.google.com/o/oauth2/token', {form: {code: code, client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET,
                                                              redirect_uri: process.env.REDIRECT_URI, grant_type: process.env.GRANT_TYPE}},
    function(e, r, _body) {
      Query.body = JSON.parse(_body);
      User.findOne({google_id: req.user.google_id}).exec(function(err, db_user) {
        if (err || !db_user) {
          res.redirect('/auth/google');
        } 
        console.log("DB USER:", db_user);
        console.log('BODY: ', body);
        var body = Query.body;
        var user_gmail = db_user.gmail;
        var access_token = body["access_token"];
        var token_type = body["token_type"];
        var expires_in = body["expires_in"];
        var id_token = body["id_token"];
        var refresh_token = body["refresh_token"];

        console.log("Access: ", access_token);
        console.log("Type: ", token_type);
        console.log("Expires: ", expires_in);
        console.log("Id: ", id_token);
        console.log("Refresh: ", refresh_token);

        var client = inbox.createConnection(false, "imap.gmail.com", {
          secureConnection: true,
          auth:{
            XOAuth2:{
              user: user_gmail,
              clientId: process.env.CLIENT_ID,
              clientSecret: process.env.CLIENT_SECRET,
              refreshToken: refresh_token,
              accessToken: access_token,
              timeout: 0
            }
          }
        });

        client.connect();

        client.on("connect", function(){
          client.openMailbox("INBOX", function(error, info){
            if(error) throw error;
            var query = req.session.q || ""
            client.search('UID SEARCH X-GM-RAW "' + query + '"', function(err, uids){
              var messages = [];
              function recursiveFetch(uids, count, max) {
                if (uids.length != 0 && count < max) {
                  client.fetchData(uids.pop(), function(err, data) {
                    count++;
                    messages.push(data)
                    recursiveFetch(uids, count, max);
                  });
                } else {
                  console.log(messages);
                  res.send(messages);
                }
              }
              recursiveFetch(uids, 0, 10);
            });
          });
        });
      })
    }
  );
}

app.get('/google_login', function(req, res){
  var code = req.query.code;
  User.findOne({_id: req.user._id}, function(err, db_user) {
    if (err) {
      console.log(err);
    } else if (db_user) {
      db_user.code = code;
      db_user.save(function(err, db_user) {
        gmail(req, res, code);
      });
    }
  });
  // console.log("CODE: ", code);
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}