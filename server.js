var express = require('express');
var app = express();
var exec = require('child_process').exec;
var Parse = require('parse').Parse;

Parse.initialize("hTpkQ62vQCT1GnCpFzWbg5afa2K64mhVvAknLByG", "Fib8IvNfUhyTbYUVn5s82acCKM8IBu5mqUYtodmk");

var version_namespace = '/api/v1';
app.get(version_namespace + '/source/:id', function(req, res) {
    get_tv_state(function(tv){
	var increment = req.params.id - tv.get("source");
	change_source(increment, function(){
	    tv.save({source : Number(req.params.id)}, {success:
					       function(object){
						   return res.send('success');
					       },
					       error:
					       function(object, error){
						   console.log(error.message);
						   res.statusCode = 500;
						   return res.send('failure');
					       }
					      });
	}, function(){
	    res.statusCode = 500;
	    return res.send('failure');
	});
    });
});

app.get(version_namespace + '/power_on', function(req, res) {
    get_tv_state(function(tv){
	if (!tv.get("on")){
	    toggle_power(function(){
		tv.save({on : !tv.get("on")}).then(function(object){
		    return res.send('success');
		});
	    }, function(){
		res.statusCode = 500;
		return res.send('failure');
	    });
	}
    });
});

app.get(version_namespace + '/power_off', function(req, res) {
    get_tv_state(function(tv){
	if (tv.get("on")){
	    toggle_power(function(){
		tv.save({on : !tv.get("on")}).then(function(object){
		    return res.send('success');
		});
	    }, function(){
		res.statusCode = 500;
		return res.send('failure');
	    });	
	}
    });
});

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
    exec("irsend SEND_ONCE ocosmo " + key, function(error, stdout, stderr){
	if (error !== null){
	    console.log("error: " + error);
	    failure();
	}else{
	    success();
	}
    });
}

function get_tv_state(completion){
    var query = new Parse.Query(Parse.Object.extend("Television"));
    query.find({
	success: function(televisions) {
	    completion(televisions[0]);
	}
    });
}

app.listen(process.env.PORT || 8081);
