
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    rem = require('rem');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.cookieParser());
  app.use(express.session({
    secret: "some arbitrary secret"
  }));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.set('port', process.env.PORT || 3000);

// Routes

app.get('/', routes.index);

app.listen(app.get('port'), function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
