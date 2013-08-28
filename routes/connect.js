var models = require('../models/models.js')
var User = models.User;

exports.register = function(req, res) {
	res.render('register', {title: 'Register for spokes'});
}

exports.addUser = function(req, res) {
	console.log(req.body);
	User.findOne({gmail: gmail}, function(err, db_user) {
		if (db_user) {
			console.log("Account already exists...");
			res.redirect('/');
		} else {
			var new_user = User({'gmail': req.body.gmail});
			new_user.save(function(err, db_user) {
			    if(err) {
			        console.log("Error: ", err);
			        res.send('/500');
			    } else {
			        req.session.user = db_user
			        res.redirect('/');
			    }
			});
		}
	})
}
