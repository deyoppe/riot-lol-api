/* global Promise */
var https = require('https');
var cheerio = require('cheerio');
var pluralize = require('pluralize');
var request = require('request');
var _ = require('lodash');
var api = require('./api/calls.json');

var host = "https://{region}.api.pvp.net";

module.exports = function(token) {
  var generateCall = function(path, required, queries) {
    console.log('Generating call', path, required, queries);
    return function() {
      console.log('Called', path, 'with', arguments);
      var args = arguments;
      var call = function(resolve, reject) {
        var prefix = host;
        if(path.match(/static-data/)) {
          prefix = prefix.replace(/{region}/, 'global');
        }
        var url = prefix + path;
        var i = 0;
        required.forEach(function(element) {
          if(!args[i]) {
            var err = "Required argument "+(i+1)+" of "+(args.length+1)+" ("+element+")";
            reject(err);
            throw err;
          }
          url = url.replace(RegExp("{"+element+"}", "g"), args[i]);
          i += 1;
        }, this);
        
        url += '?api_key='+token+'&';            
          
        if (queries && queries.length > 0) {
          url += _(queries).map(function(query) {
            return query+'='+args[i];
          }).join('&');
        }
        console.log(url);
        request(url, function(error, response, body) {
          resolve(JSON.parse(body));
        });
      };
      
      return new Promise(call);
    };
  };
    
  for (var iEndpoint in api) {
    for (var iCall in api[iEndpoint]) {
      var callData = api[iEndpoint][iCall];
      api[iEndpoint][iCall] = generateCall(callData.path, callData.required, callData.optional);
    }
  }
  
  return api;
};