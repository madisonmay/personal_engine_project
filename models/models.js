var mongoose = require('mongoose');

//This data is needed for Bayesian categorization
var keywordSchema = mongoose.Schema({
    word: String,
    services: mongoose.Schema.Types.Mixed,
    total_count: Number
});

//Stores global usage counts for each service
var serviceSchema = mongoose.Schema({
	name: String,
	count: Number
})

var userSchema = mongoose.Schema({
	first_name: String,
	last_name: String,
	gmail: String,
	google_id: String,
	code: String
})

var Keyword = mongoose.model('Keyword', keywordSchema);
var Service = mongoose.model('Service', serviceSchema);
var User = mongoose.model('User', userSchema);

exports.Keyword = Keyword;
exports.Service = Service;
exports.User = User;