var Models = require('../models/models.js');
var Keyword = Models.Keyword;
var Service = Models.Service;
var google = require('google');
var images = require('google-images');
var config = require('../config.js');
var request = require('request');
var inbox = require('inbox');
var User = Models.User;



//google plugin configuration
google.resultsPerPage = 10;

function google_web(req, res, query, refresh, bayes_result) {
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

	    var data = {'title': query, 'links': links, 'search_type': 'google_web', 'services': bayes_result};
	    if (!refresh) {
	    	//full page load
	    	res.render('results', data);
	    } else {
	    	//jquery refresh
			res.render('links', data);
		}
	});
}

function google_images(req, res, query, refresh, bayes_result) {

	images.search(query, {page: 1, callback: process_results});

	function process_results(err, images) {
		if (err) {
			console.error(err);
		}

		var data = {'title': query, 'links': images, 'search_type': 'google_images', 'services': bayes_result};
		if (!refresh) {
			//full page load
			res.render('results', data);
		} else {
			//jquery refresh
			res.render('links', data);
		}
	}
}

function gmail_messages(req, res) {
  req.session.q = req.query.q;
  req.session.reload(console.log);
  if (req.user) {
    res.redirect(process.env.AUTH_URL); 
  } else {
    res.redirect('/auth/google');
  }
}

function gmail(req, res, query, refresh, bayes_result) {
  var refresh = refresh;
  var bayes_result = bayes_result;
  var query = query;
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
        	refresh_token = db_user.refresh_token;
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
        	            console.log()
        	            data.thread_hex = parseInt(data.xGMThreadId).toString(16).toLowerCase();
        	            messages.push(data)
        	            recursiveFetch(uids, count, max);
        	          });
        	        } else {
        	          var data = {'title': query, 'links': messages, 'search_type': 'gmail', 'services': bayes_result};
        	          if (!refresh) {
        	          	//full page load
        	          	res.render('results', data);
        	          } else {
        	          	//jquery refresh
        	          	res.render('links', data);
        	          }
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

exports.gmail = gmail;
exports.gmail_messages = gmail_messages;

var fns = {'google_web': google_web, 'google_images': google_images, 'gmail': gmail}

var randomProperty = function (obj) {
    var keys = Object.keys(obj)
    return obj[keys[ keys.length * Math.random() << 0]];
};

exports.search = function(req, res) {
	console.log(Object.keys(fns));
	var capitalized_query = req.query.q.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"");
	var query_single_spaced = capitalized_query.replace(/\s{2,}/g," ");
	var query = query_single_spaced.toLowerCase();
	var words = query.split(' ');
	var word_probabilites = [];

	Service.find({}, function(err, services) {
		var total = 0;
		var serviceMap = {}
		services.forEach(function(service) {
			total += service.count;
		});

		services.forEach(function(service) {
			serviceMap[service.name] = service.count/total;
		})

		function populateProbs(words) {
			console.log(words);
			if (!words.length) {
				return finish();
			}
			var word = words.splice(0, 1)[0];
			Keyword.findOne({word: word}, function(err, db_keyword){

				//error or no keyword found in db
				if (err || !db_keyword) {
					//next word
					populateProbs(words);
				} else {
					var keyword_total = 0;
					for (service in db_keyword.services) {
						keyword_total += db_keyword.services[service];
					}
					var keyword_prob = keyword_total/total;
					var probabilities = [];
					services.forEach(function(service) {
						var prob = ((db_keyword.services[service.name]/service.count)*serviceMap[service.name])/keyword_prob;
						// console.log("service: " + service);
						// console.log("keyword_total: " + keyword_total);
						// console.log("db_keyword.services[service.name]: " + db_keyword.services[service.name]);
						// console.log("service.count: " + service.count);
						// console.log("serviceMap[service.name]: " + serviceMap[service.name]);
						// console.log("keyword_prob: " + keyword_prob);
						probabilities.push([prob, service.name]);
					});

					word_probabilites.push(probabilities);
					populateProbs(words);
				}
			})
		}
		populateProbs(words);
	});

	function finish() {
		//generate best guess based on bayesian prediction
		var service_probabilites = {};
		for (var i=0; i<word_probabilites.length; i++) {
			var probs = word_probabilites[i];
			for (var j=0; j<probs.length; j++) {
				var service = probs[j][1];
				var p = probs[j][0];
				if (service in service_probabilites) {
					service_probabilites[service].push(p);
				} else {
					service_probabilites[service] = [p];
				}
			}
		}

		var bayes_result = []
		for (service in service_probabilites) {
			var values = service_probabilites[service];
			var product = 1;
			var inverse_product = 1;
			for (var i=0; i<values.length; i++) {
				product *= values[i];
			}
			for (var i=0; i<values.length; i++) {
				inverse_product *= 1-values[i];
			} 
			var value = product/(product + inverse_product);
			bayes_result.push([value, service]);
		}
		bayes_result.sort(function(a, b) {return b[0] - a[0]});

		//rankings
		console.log("Bayes result:", bayes_result);

		if (!bayes_result.length) {
			for (fn in fns) {
				bayes_result.push([1, fn]);
			}
			google_web(res, query, refresh=false, bayes_result);
		}

		var key = bayes_result[0][1];
		if (key in fns) {
			var fn = fns[key];
		} else {
			var fn = google_web;
		}

		fn(req, res, query, refresh=false, bayes_result);
	}
}

exports.refresh = function(req, res) {
	var service = req.body.service;
	var query = req.body.q;

	//alternative to eval
	var fn = fns[service];
	if(typeof fn === 'function') {
	    fn(req, res, query, refresh=true);
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
			var word = words.splice(0, 1)[0];
			
			if (word.length <= 2) {
				return keyword_increment(words, service);
			}

			Keyword.findOne({word: word}).exec(function(err, db_keyword) {

			    if (db_keyword) {

			    	//increment count for keyword -> service mapping
			    	db_keyword.services[service]++;

			    	//increment count for keyword
			    	db_keyword.total_count++;
			    	db_keyword.markModified('services');
			    	db_keyword.save(function(err, keyword) {
			    		if (err) {
			    			console.log(err);
			    		}
			    		//increment count for service
			    		Service.findOne({name: service}).exec(function(err, db_service) {
			    			if (db_service) {
			    				db_service.count += 1;
			    				db_service.save(function(err, db_service) {
			    					return keyword_increment(words, service);
			    				});
			    			} else {
			    				//service does not yet have db object
			    				if (service in fns) {
			    					new_service = Service({name: service, count: 1});
			    					new_service.save(function(err, service) {
			    						return keyword_increment(words, service);
			    					});
			    				}
			    			}
			    		});
			    	})

			    } else {
			    	//create new entry in db
			    	var initial_entry = {}
			    	var total = 0

			    	//should make copy of the global var instead of manually copying
			    	var functions = {'google_web': google_web, 'google_images': google_images, 'gmail': gmail};

			    	//laplacian smoothing
			    	function incrementCounts(functions) {
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
			    					db_service.save(function(err, db_service) {
			    						return incrementCounts(functions);
			    					});
			    				} else {
			    					//service does not yet have db object
			    					if (service in fns) {
			    						new_service = Service({name: service, count: initial_entry[key]});
			    						new_service.save(function(err, new_service) {
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
	   			        new_keyword.save();
			   		}

			   		incrementCounts(functions);
			    }
			});
		} else {
			return;
		}
	}
}