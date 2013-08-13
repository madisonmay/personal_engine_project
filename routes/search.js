var google = require('google');

//google plugin configuration
google.resultsPerPage = 25;

exports.google = function(req, res) {
	google(req.query.q, function(err, next, links){
	    if (err) {
	    	console.error(err);
	    }

	    res.send(links);
	    // for (var i = 0; i < links.length; ++i) {
	    //     console.log(links[i].title + ' - ' + links[i].link); 
	    //     console.log(links[i].description + "\n");
	    // }
	});
}