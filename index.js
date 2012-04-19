#!/usr/bin/env node

var fs = require('fs');
var qs = require('querystring');
var exec = require('child_process').exec;
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
    // Get IP of this machine
    function(cb) {
        exec(options.ipcmd,
          function (err, stdout, stderr) {
              cb(null, stdout.replace('\n', ''));
          }
    )},
    // Get id's of all inputs
    function(ip, cb) {
        request(
          { uri: baseurl + 'inputs',
            headers: headers
          }, function(err, res, body) {
            var inputs = _.map(JSON.parse(body), function(item) { return item.id });
            cb(null, ip, inputs); 
        });
    },
    // Build map of devices
    function(ip, inputs, cb) {
        request(
          { uri: baseurl + 'devices',
            headers: headers
          }, function(err, res, body) {
            var devices = {};
            _.each(JSON.parse(body), function(device) {
                devices[device.ip] = device.id;
            });
            cb(null, ip, inputs, devices); 
        });
    },
    function(ip, inputs, devices, cb) {
        // Add device to each input
        if (options.op == 'start') {
            _.each(inputs, function(input) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                request(
                    { uri: baseurl + 'devices',
                      headers: headers,
                      method: 'POST',
                      body: qs.stringify({ 'input_id': input, 'ip': ip }).replace('"', '')
                    }, function(err, res, body) {
                        // 
                    }
                );
            });
        } else if (options.op == 'stop') {
            // Deletes device from all inputs
            request(
                { uri: baseurl + 'devices/' + devices[ip],
                  headers: headers,
                  method: 'DELETE',
                }, function(err, res, body) {
                        // 
                }
            );
        }
    }
]);
