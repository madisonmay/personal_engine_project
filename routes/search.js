var google = require('google');
var images = require('google-images');

//google plugin configuration
google.resultsPerPage = 10;

function google_web(res, query, refresh) {
	google(query, function(err, next, links){
	    if (err) {
	    	console.error(err);
	    }

	    var data = {'title': query, 'links': links};
	    if (!refresh) {
	    	//full page load
	    	res.render('results', data);
	    } else {
	    	//jquery refresh
			res.render('links', data);
		}
	});
}

function google_images(res, query, refresh) {
	images.search(query, function(err, images) {
		if (err) {
			console.error(err);
		}

		var data = {'title': query, 'links': images};
		if (!refresh) {
			//full page load
			res.render('results', data);
		} else {
			//jquery refresh
			res.render('links', data);
		}
	});
}

var fns = {'google_web': google_web, 'google_images': google_images}

exports.search = function(req, res) {
	google_web(res, req.query.q, refresh=false);
}

exports.refresh = function(req, res) {
	var service = req.body.service;
	var query = req.body.q;

	//alternative to eval
	var fn = fns[service];
	if(typeof fn === 'function') {
	    fn(res, query, refresh=true);
	}
}