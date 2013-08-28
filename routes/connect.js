var models = require('../models/models.js')
var User = models.User;

exports.register = function(req, res) {
	res.render('register', {title: 'Login to spokes'});
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
