/* global Promise */
var cheerio = require('cheerio'),
    pluralize = require('pluralize'),
    request = require('request'),
    _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    process = require('process'),
    client = require('./client'),
    token = require('./tokens.json').riot;

var apiUrl = 'https://developer.riotgames.com/api/methods';

function update(resolve, reject) {
  console.log('Updating');
  var api = {};
  
  var parse = function(error, response, body) {
    var $ = cheerio.load(body);
    
    $("[data-version]").each(function() {
      var $api = $(this);
      var dataVersion = $api.attr('data-version').match(/(lol-)?(.*)-v(.*)/);
      var apiName = dataVersion[2],
          version = dataVersion[3];
      var endpoints = {};
      
      $api.find('.endpoint').each(function() {
        var $endp = $(this);
        var path = $endp.find('.path').text().trim();
        var apiCallUrl = path.split('/'+apiName)[1] || '';
        
        var apiCallName = _(apiCallUrl.split('/')).filter(function(v) {
          return !(/[{}]/g.test(v) || v === 'v'+version);
        }).reverse().join('-');
        apiCallName = _.camelCase("get-"+apiCallName);
        
        var required = _(path.match(/{(.*?)}/g)).map(function(str) {
          return str.replace(/[{}]/g, '');
        }).value();
        var optional = [];
        
        $endp.find(".operation-params > tr > td:nth-child(0)").each(function() {
          optional.push($(this).html().split(/<div/)[0]);
        })
        
        if(endpoints[apiCallName] && _.endsWith(path, '/{id}')) {
          var listCall = endpoints[apiCallName];                
          var listCallName = _.camelCase('list-'+pluralize(apiCallName.match(/^get(.*)/)[1]));
          endpoints[listCallName] = listCall;
        }
        
        endpoints[apiCallName] = {
          path : path, 
          required : required, 
          optional : optional
        };
      });
      apiName = _.camelCase(apiName);
      api[apiName] = endpoints; 
    });  
    
    resolve(api);
  };
  
  request(apiUrl, parse);
};

new Promise(update).then(function(calldata) {
  var apipath = path.join(__dirname, 'api');
  
  console.log("Saving API in "+apipath);
  fs.writeFileSync(path.join(apipath, 'calls.json'), JSON.stringify(calldata));
  
  var api = client(token);
  
  var done = _.after(3, function() {
    console.log("Update complete");
    process.exit();
  });
  
  api.staticData.listChampions('euw').then(function(res) { 
    var champions = _.indexBy(res.data, 'id');
    fs.writeFile(path.join(apipath, 'champions.json'), JSON.stringify(champions), function() {
      console.log('Champions successfully updated');
      done();
    });
  });
  api.staticData.listItems('euw').then(function(res) { 
    var items = _.indexBy(res.data, 'id');
    fs.writeFile(path.join(apipath, 'items.json'), JSON.stringify(items), function() {
      console.log('Items successfully updated');
      done();
    });
  });
  api.staticData.listSummonerSpells('euw').then(function(res) { 
    var items = _.indexBy(res.data, 'id');
    fs.writeFile(path.join(apipath, 'spells.json'), JSON.stringify(items), function() {
      console.log('Spells successfully updated');
      done();
    });
  });
});