var express = require('express');
var app = express();
var exec = require('child_process').exec;
var request = require('request-json');
var bodyParser = require('body-parser');
var os = require('os');
var ifaces = os.networkInterfaces();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

var client = request.createClient('https://roost-remote-devices.herokuapp.com/')
client.headers['Content-type'] = 'application/json'
client.headers['X-API-Key'] = '*******'
var deviceId = '*******'
var deviceEndpoint = 'api/v1/devices/' + deviceId;

var version_namespace = '/api/v1';
app.get(version_namespace + '/index', function(req, res) {
    var result = {}
    get_ip_address(function(ip_address){
      result.host = ip_address
      result.host_namespace = 'api/v1'
      var endpoints = [];

      var power = {};
      power.name = "Power";
      power.method = "PUT";
      power.endpoint = "/power";
      var options = {};
      options.key = "on";
      options.values = [{name:"On", value:true},{name:"Off", value:false}];
      power.options = options;
      endpoints.push(power);

      var source = {};
      source.name = "Source";
      source.method = "PUT";
      source.endpoint = "/source";
      options = {};
      options.key = "source";
      options.values = [{name:"TV", value:1}, {name:"Video Games", value:2}, {name:"AV", value:3}, {name:"Chromecast", value:4}, {name:"OSMC", value:5}];
      source.options = options;
      endpoints.push(source);
      
      result.endpoints = endpoints;
      return res.send(result);
    })
});

app.put(version_namespace + '/source', function(req, res) {
  get_tv_state(function(tv){
    var increment = req.body.source - tv.properties.source;
    change_source(increment, function(){
      var data = {properties: {on: tv.properties.on, source: Number(req.body.source)}}
      client.put(deviceEndpoint, data, function(err, response, body){
        if (err) {
          console.log(err.message);
          res.statusCode = 500;
          return res.send('failure');
        } else{
          return res.send('success');
        };
      })
    }, function(){
        res.statusCode = 500;
        return res.send('failure');
    });
  });
});

app.put(version_namespace + '/power', function(req, res) {
  get_tv_state(function(tv){
    if (tv.properties.on != req.body.on){
      toggle_power(function(){
        tv.properties = {on: !tv.properties.on, source: tv.properties.source};
        client.put(deviceEndpoint, tv, function(err, response, body){
          if (err) {
            res.statusCode = 500;
            return res.send('failure');
          } else{
            return res.send('success');
          };
        })
      }, function(){
          res.statusCode = 500;
          return res.send('failure');
      });
    }
  });
});

function get_ip_address(completion){
  Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    var already_returned = false;
    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }

      if (!already_returned) {
        completion(iface.address)
      } else{};
    });
  });
}

function toggle_power(success, failure){
    send_command("KEY_POWER", success, failure);
}

function change_source(increment, success, failure){
    if (increment !== 0){
  send_command("KEY_SWITCHVIDEOMODE", function(){
      var key;
      if (increment < 0){
    key = "KEY_UP";
      }else if (increment > 0){
    key = "KEY_DOWN";
      }
      send_command_n_times(increment, key, function(){
    send_command_n_times(1, "KEY_ENTER", success, failure);
      }, failure);
  }, failure);
    }else{
  success();
    }
}

function send_command_n_times(n, key, success, failure){
    if (n === 0){
  success();
    }else{
  setTimeout(function(){
      send_command(key, function(){
    if (n < 0){
        n++;
    }else if (n > 0){
        n--;
    }
    send_command_n_times(n, key, success, failure);
      }, failure);
  }, 100);
    }
}

function send_command(key, success, failure){
    exec("irsend -d /var/run/lirc/lircd-lirc0 SEND_ONCE \"ocosmo\" \"" + key + "\"", function(error, stdout, stderr){
  if (error !== null){
      console.log("error: " + error);
      failure();
  }else{
      success();
  }
    });
}

function get_tv_state(completion){
  client.get(deviceEndpoint, function(err, response, body){
    if (err) {
      console.log(err);
    } else{
      completion(body);
    };
  });
}

app.listen(process.env.PORT || 8081);

console.log("roost remote server started");