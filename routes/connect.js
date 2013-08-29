var config = require('../config.js');
var models = require('../models/models.js');
var request = require('request');
var inbox = require('inbox');
var User = models.User;

exports.register = function(req, res) {
	res.render('register', {title: 'Add Gmail access', user: req.user});
}

exports.addUser = function(req, res) {
	User.findOne({gmail: req.body.gmail}, function(err, db_user) {
		if (db_user) {
			console.log("Account already exists...");
			req.session.uid = db_user._id;
			req.session.reload(console.log);
			res.redirect('/');
		} else {
			var new_user = User({'gmail': req.body.gmail});
			new_user.save(function(err, db_user) {
			    if (err) {
			        console.log("Error: ", err);
			        res.send('/500');
			    } else {
			        req.session.uid = db_user._id;
			        req.session.reload(console.log);
			        console.log("UID:", req.session.uid);
			        res.redirect('/');
			    }
			});
		}
	})
}

exports.gmail = function(req, res, code) {
  console.log("CODE: ", req.user.code);
  request.post('https://accounts.google.com/o/oauth2/token', {form: {code: req.user.code, client_id: process.env.CLIENT_ID, client_secret: process.env.CLIENT_SECRET,
                                                              redirect_uri: process.env.REDIRECT_URI, grant_type: process.env.GRANT_TYPE}},
    function(e, r, _body) {
      Query.body = JSON.parse(_body);
      User.findOne({google_id: req.user.google_id}).exec(function(err, db_user) {
        if (err || !db_user) {
          res.redirect('/auth/google');
        } 
        console.log("DB USER:", db_user);
        var body = Query.body;
        console.log('BODY: ', body);
        var user_gmail = db_user.gmail;
        var access_token = body["access_token"];
        var token_type = body["token_type"];
        var expires_in = body["expires_in"];
        var id_token = body["id_token"];
        var refresh_token = body["refresh_token"];

        if (refresh_token) {
        	db_user.refresh_token = refresh_token;
        	db_user.save(function(err, db_user) {
        		if (err) {
        			console.log(err);
        		} else {
        			proceed();
        		}
        	});
        } else {
        	proceed();
        }

        function proceed() {
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
        }
      })
    }
  );
}
