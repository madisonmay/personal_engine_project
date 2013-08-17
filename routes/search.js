var Models = require('../models/models.js');
var Keyword = Models.Keyword;
var google = require('google');
var images = require('google-images');


//google plugin configuration
google.resultsPerPage = 10;

function google_web(res, query, refresh) {
	google(query, function(err, next, links){
	    if (err) {
	    	console.error(err);
	    }

	    //iterate backwards in order to safely 
	    //delete elements on the fly
	    for (var i=links.length-1; i>=0; i--) {
	    	//no associated url
	    	if (!links[i].link) {
	    		//remove item from list
	    		links.splice(i, 1);
	    	} else {
	    		//use link.url to store url
	    		links[i].url = links[i].href
	    	}
	    }

	    var data = {'title': query, 'links': links, 'search_type': 'google_web'};
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
	function process_results(err, images) {
		if (err) {
			console.error(err);
		}

		var data = {'title': query, 'links': images, 'search_type': 'google_images'};
		if (!refresh) {
			//full page load
			res.render('results', data);
		} else {
			//jquery refresh
			res.render('links', data);
		}
	}

	images.search(query, {page: 1, callback: process_results});
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

exports.bayesUpdate = function(req, res) {
	console.log(req.body);
	res.send(req.body);
}