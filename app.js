/**
* Module dependencies.
*/

var express = require('express')
, fs = require("fs")
, routes = require('./routes')
, login = require('./routes/login')
, thermostats = require('./routes/thermostats')
, http = require('http')
, path = require('path')
, api = require('./ecobee-api');

var app = express();

ecobeeConfig = {};

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('ecobee sample api app')); // using signed cookies to store the refresh token
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// Define all of the applicaiton endpoints for get and post
app.get('/', routes.index);

// check routes/login.js for the implementation details of the login routes
app.get('/login', login.list);  // login page
app.get('/login/getpin', login.getpin);  // login page
app.get('/login/error', login.error); // error page
app.post('/login', login.create);  // login post handler

// check routes/thermostats.js for the implementation details of the thermostat routes
app.post('/thermostats/:id/sethold', thermostats.hold);  // adjust a specific thermostat hold
app.post('/thermostats/:id/resume', thermostats.resume);  // resume a specific thermostat
app.get('/thermostats/:id', thermostats.view); // view a specific thermostat
app.get('/thermostats', thermostats.list); // list all the users thermostats


// app.post('/:hvacmode',  (req, res) => {
//   // Reading isbn from the URL
//   const isbn = req.params.isbn;

//   // Searching books for the isbn
//   for (let book of books) {
//       if (book.isbn === isbn) {
//           res.json(book);
//           return;
//       }
//   }

//   // Sending 404 when not found something is a good practice
//   res.status(404).send('Book not found');
// });

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var readConfig = function() {
  try {
    // Note that jsonString will be a <Buffer> since we did not specify an
    // encoding type for the file. But it'll still work because JSON.parse() will
    // use <Buffer>.toString().
    const jsonString = fs.readFileSync("./ecobeeConfig.json");
    ecobeeConfig = JSON.parse(jsonString);
  } catch (err) {
    console.log(err);
    ecobeeConfig = {
      // "authcode": "pinResults.code",
      // "pin": "pinResults.ecobeePin",
      // "interval": "pinResults.interval"
    };
  }
};

saveConfig = function() {
  const jsonString = JSON.stringify(ecobeeConfig, null, 4);
  console.log(jsonString);
  
  fs.writeFileSync('./ecobeeConfig.json', jsonString);
  console.log("File written successfully\n");
}

readConfig();
saveConfig();

/*var getAccessToken = function(cb) {
  if (ecobeeConfig.access_token) {
    cb(true);
  }
  else {
    // No access token yet => request one
    api.calls.registerPin(ecobeeConfig.apiKey, ecobeeConfig.code, function(err, registerResultObject) {
      var tooFast = false;
      if(err) {
        var errorMessage = '';
        
        console.log(err)
        if(err.data && err.data.error && err.data.error === 'slow_down') {
          errorMessage = 'Polling too fast: Please wait ' + req.session.interval + ' seconds before attempting to complete the link again.';
          tooFast = true;
        } else { 
          errorMessage = 'you must first authorize the app on your ecobee portal settings page. Then click the complete link button below.';
        }
        cb(false);
      } else {
        ecobeeConfig.access_token = registerResultObject.access_token;
        ecobeeConfig.expires_in = registerResultObject.expires_in;
        ecobeeConfig.refresh_token = registerResultObject.refresh_token;
        
        saveConfig();
        
        cb(true);
      }  	
    });	
  }
}

var refreshToken = function(cb) {
  api.calls.refresh(ecobeeConfig.refresh_token, function(err, registerResultObject) {
    if (err) { // if we error refreshing the token clear session and re-log
      console.log(err.data);
      console.log(err);
      // ecobeeConfig.access_token = null;
      // ecobeeConfig.expires_in = null;
      // ecobeeConfig.refresh_token = null;
      saveConfig();
      cb(false);
    } else { // refresh of the tokens was successful to we can proceed to the main app
      ecobeeConfig.access_token = registerResultObject.access_token;
      ecobeeConfig.expires_in = registerResultObject.expires_in;
      ecobeeConfig.refresh_token = registerResultObject.refresh_token;
      saveConfig();
      cb(true);
    }  	
  });
}

var getThermostats = function(cb) {
  // get the list of thermostats
  var thermostatSummaryOptions = new api.ThermostatSummaryOptions();
  
  api.calls.thermostatSummary(ecobeeConfig.access_token, thermostatSummaryOptions, function(err, summary) {
    if(err) { 
      console.log(err);
      
      if (err.data.status.code == 14) {
        // authentication token has expired
        refreshToken(function (sucess) {
          if (sucess) {
            getThermostats(cb);
          } else {
            cb(false);
          }
        });
      }
      else {
        cb(false);
      }
    }
    else {
      var thermostatArray = [];
      console.log(summary)
      
      for( var i = 0; i < summary.revisionList.length; i ++) {
        var revisionArray = summary.revisionList[i].split(':');
        thermostatArray.push({ name : revisionArray[1], thermostatId : revisionArray[0]} );
      }
      
      ecobeeConfig.thermostats = thermostatArray;
      
      ecobeeConfig.expires = new Date(Date.now() + 9000000);
      // res.render('thermostats/index', {thermostats : thermostatArray});
      saveConfig();
      
      cb(true);
    }
  });
}

var setHvacMode = function(thermostatId, hvacMode, cb) {
  var thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId);
  // , holdTemp = 22
  // , desiredCool = 770 // some defaults for these values
  // , desiredHeat = 690;
  
  // if(hvacMode === 'heat' || hvacMode === 'auxHeatOnly') {
  //   desiredHeat = holdTemp * 10; // our canonical form is F * 10
  // } else {
  //   desiredCool = holdTemp * 10; // our canonical form is F * 10
  // }
  
  var functions_array = [];
  // var set_hold_function = new api.SetHoldFunction(desiredCool, desiredHeat,'indefinite', null);
  // var celcius = -32;
  // var faranheit = Math.round((celcius * 1.8) + 32);
  
  thermostats_update_options.thermostat = {
    "settings": {
      "hvacMode": hvacMode
    }
  };
  
  api.calls.updateThermostats(ecobeeConfig.access_token, thermostats_update_options, functions_array, null, function(error) {
    if(error) {
      console.log(error);
      cb(false);
    } 
    else {
      console.log("SUCCESS")
      cb(true);
    }
  });
}*/

/*getAccessToken(function(success) {
  console.log("Success " + success);
  if (success) {
    getThermostats(function (success) {
      if (success) {
        var thermostatId = ecobeeConfig.thermostats[1].thermostatId
        , hvacMode = 'heat';
        // , hvacMode = 'auxHeatOnly';
        
        setHvacMode(thermostatId, hvacMode, function(success) {
          if (success) {
            console.log("Success!!!");
          }
        });
      }
    });
  }
});
*/