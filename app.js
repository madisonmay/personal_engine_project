
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    request = require('request'),
    google = require('google'),
    images = require('google-images'),
    connect = require('./routes/connect.js'),
    search = require('./routes/search.js'),
    mongoose = require('mongoose'),
    querystring = require('querystring'),
    inbox = require('inbox'),
    rem = require('rem');

var app = module.exports = express.createServer();
mongoose.connect((process.env.MONGOLAB_URI||'mongodb://localhost/pep'));

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

var uri = encodeURIComponent;
var base_url = 'https://accounts.google.com/o/oauth2/auth?';
var email = 'https://www.googleapis.com/auth/userinfo.email';
var profile = 'https://www.googleapis.com/auth/userinfo.profile';
var gmail = 'https://mail.google.com/'
var state = '/profile';
var redirect_uri = 'http://localhost:3000/google_login';
var grant_type = 'authorization_code'
var response_type = 'code';
var client_id = "773068938585.apps.googleusercontent.com";
var access_type = 'offline';
var query_params = 'scope='+uri(email)+'+'+uri(profile)+'+'+uri(gmail)+'&state='+uri(state)+'&redirect_uri='+uri(redirect_uri)+
                   '&response_type='+uri(response_type)+'&client_id='+uri(client_id)+'&access_type='+uri(access_type);
var auth_url = base_url + query_params;

app.get('/google', function(req, res) {
  res.redirect(auth_url);
})

app.get('/google_login', function(req, res){
  var code = req.query.code;
  request.post('https://accounts.google.com/o/oauth2/token', {form: {code: code, client_id: client_id, client_secret: process.env.CLIENT_SECRET,
                                                              redirect_uri: redirect_uri, grant_type: grant_type}},
    function(e, r, body) {
      var body = JSON.parse(body);
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
                  user: "worldpeaceagentforchange@gmail.com",
                  clientId: client_id,
                  clientSecret: process.env.CLIENT_SECRET,
                  refreshToken: refresh_token,
                  accessToken: access_token,
                  timeout: expires_in
              }
          }
      });

      client.connect();

      client.on("connect", function(){
          client.openMailbox("INBOX", function(error, info){
              if(error) throw error;

              client.listMessages(-10, function(err, messages){
                  messages.forEach(function(message){
                      console.log(message.UID + ": " + message.title);
                  });
              });

          });
      });
    }
  );
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

