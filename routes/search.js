var Models = require('../models/models.js');
var Keyword = Models.Keyword;
var Service = Models.Service;
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

	images.search(query, {page: 1, callback: process_results});

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
}

var fns = {'google_web': google_web, 'google_images': google_images}

var randomProperty = function (obj) {
    var keys = Object.keys(obj)
    return obj[keys[ keys.length * Math.random() << 0]];
};

exports.search = function(req, res) {
	var query = req.query.q;

	Service.find({}, function(err, services) {
		var total = 0;
		var serviceMap = {}
		services.forEach(function(service) {
			total += service.count;
		});

		services.forEach(function(service) {
			serviceMap[service] = service.count/total;
		})

		Keyword.findOne({name: query}, function(err, db_keyword){

			//error or no keyword found in db
			if (err || !db_keyword) {
				//use random search engine
				var fn = randomProperty(fns);
				fn(res, query, refresh=false);
			} else {
				var keyword_total = 0;
				for (service in db_keyword.services) {
					keyword_total += db_keyword.services[service];
				}
				var keyword_prob = keyword_total/total;
				services.forEach(function(service) {
					var prob = ((keyword_total/service.count)*serviceMap[service])/keyword_prob;
					console.log(service.name + ': ' + prob);
				});

				//still search randomly -- for now
				var fn = randomProperty(fns);
				fn(res, query, refresh=false);
			}
		})
	});
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

	var service = req.body.search_type
	var capitalized_query = req.body.q.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
	var query_single_spaced = capitalized_query.replace(/\s{2,}/g," ");
	var query = query_single_spaced.toLowerCase();
	var words = query.split(' ');

	//exit if data is not valid
	if (!service || !query) {
		return;
	}

	keyword_increment(words, service);

	//check to see if keyword already exists in database
	//recursive -- decreases length of words by 1 each execution
	function keyword_increment(words, service) {
		if (words.length > 0) {
			var word = words[0];
			words.splice(0, 1);

			if (word.length <= 2) {
				return keyword_increment(words, service);
			}

			Keyword.findOne({word: word}).exec(function(err, db_keyword) {

			    if (db_keyword) {
			    	//increment count for keyword -> service mapping
			    	db_keyword.services[service]++;

			    	//increment count for keyword
			    	db_keyword.total_count++;
			    	db_keyword.save(function(err, keyword) {
			    		return keyword_increment(words, service);
			    	})

			    } else {
			    	//create new entry in db
			    	var initial_entry = {}
			    	var total = 0

			    	//should make copy of the global var instead of manually copying
			    	var functions = {'google_web': google_web, 'google_images': google_images};

			    	//laplacian smoothing
			    	function incrementCounts(functions) {
		    			console.log(functions);
			    		if (Object.keys(functions).length) {

			    			var key = Object.keys(functions)[0];
			    			delete functions[key];

			    			if (key == service) {
			    				initial_entry[key] = 2;
			    				total += 2;
			    			} else {
			    				initial_entry[key] = 1;
			    				total++;
			    			}
			    			//increment count for service
			    			Service.findOne({name: key}).exec(function(err, db_service) {
			    				if (db_service) {
			    					db_service.count += initial_entry[key];
			    					db_service.save(function(err, data) {
			    						return incrementCounts(functions);
			    					});
			    				} else {
			    					//service does not yet have db object
			    					if (service in fns) {
			    						new_service = Service({name: service, count: 1});
			    						new_service.save(function(err, data) {
			    							return incrementCounts(functions);
			    						});
			    					}
			    				}
			    			});
			    		} else {
			    			return complete();
			    		}
			   		}

			   		function complete() {
	   			        var new_keyword = new Keyword({word: word,
	   			        						   services: initial_entry,
	   			        						   total_count: total});
	   			        new_keyword.save(function(err, keyword) {
	   						return keyword_increment(words, service);
	   			        });
			   		}

			   		incrementCounts(functions);
			    }
			});
		} else {
			return;
		}
	}
}