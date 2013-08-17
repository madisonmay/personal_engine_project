var mongoose = require('mongoose');

//Empty string will be used to store data on all queries
//This data is needed for Bayesian categorization
var keywordSchema = mongoose.Schema({
    word: String,
    services: [{name: String, count: Number}]
    total_count = Number
});

var Keyword = mongoose.model('Keyword', keywordSchema);
exports.Keyword = Keyword;