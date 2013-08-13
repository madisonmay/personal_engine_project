var rem = require('rem');


exports.calendar = function(req, res){
	console.log(req.session.user);
  	res.send('Google Calendar');
};