#!/usr/bin/env node

var fs = require('fs');
var _ = require('underscore');
var request = require('request');
var async = require('async');
var argv = require('optimist')
    .usage('Usage: $0 --config')
    .argv;
var options = {};

// Setup configuration options
if (argv.config) {
    try {
        var config = JSON.parse(fs.readFileSync(argv.config, 'utf8'));
    } catch(e) {
        console.warn('Invalid JSON config file: ' + argv.config);
       throw e;
    }
}
// Apply options from --config
_.each(config, function(v, k) {
    options[k] = v;
});

// Allow options command-line overrides
_.each(argv, function(v, k) {
    options[k] = argv[k] || options[k];
});

// Set default args last
options.op = options.op || 'start';
options.ipcmd = options.ipcmd || 'wget -q -O - http://169.254.169.254/latest/meta-data/public-ipv4';

if (!options.username || !options.password || !options.domain) {
    console.warn('Must specify all of --domain, --username, and --password');
    process.exit(1);
}

var baseurl = 'https://' + options.domain + '.loggly.com/api/';
var headers = {};
headers['authorization'] = 'Basic ' + new Buffer(options.username + ':' + options.password).toString('base64');

async.waterfall([
    function(cb) {
        request(
          { uri: baseurl + 'inputs',
            headers: headers
          }, function(err, res, body) {
            var inputs = _.map(JSON.parse(body), function(item) { return item.id });
            cb(null, inputs); 
        });
    },
    function(inputs, cb) {
        var endpoint = options.op == 'start' ? 'adddevice' : 'removedevice';
        _.each(inputs, function(input) {
            request(
                { uri: baseurl + 'inputs/' + input + '/' + endpoint,
                  headers: headers,
                  method: 'POST'
                }, function(err, res, body) {
                    // 
                });
        });
    }
]);
