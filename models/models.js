var mongoose = require('mongoose');

//Empty string will be used to store data on all queries
//This data is needed for Bayesian categorization
var keyphraseSchema = mongoose.Schema({
    phrase: String,
    services: [{name: String, count: Number}]
    total_count = Number
});

var Keyphrase = mongoose.model('Keyphrase', keyphraseSchema);
exports.Keyphrase = Keyphrase;