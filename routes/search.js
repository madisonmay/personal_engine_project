var google = require('google');
var images = require('google-images');

//google plugin configuration
google.resultsPerPage = 10;

exports.google = function(req, res) {
	google(req.query.q, function(err, next, links){
	    if (err) {
	    	console.error(err);
	    }

	    res.render('results', {'title': req.query.q, 'links': links});
	});
}

exports.images = function(req, res) {
	images.search(req.query.q, function(err, images) {
		if (err) {
			console.error(err);
		}

		res.send(images);
	});
}