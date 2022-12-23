var api = require('../ecobee-api')
  , config = require('../config');

exports.list = function(req, res){
//   var tokens = req.session.tokens;
	var tokens = ecobeeConfig.tokens;

  if(!tokens) {
	res.redirect('/login');
  }   else {
  	// get the list of thermostats
  	var thermostatSummaryOptions = new api.ThermostatSummaryOptions();
	
	api.calls.thermostatSummary(tokens.access_token, thermostatSummaryOptions, function(err, summary) {
		if(err) {
			res.redirect('/login');
		}
		else {
			var thermostatArray = [];
			console.log(summary)
			
			for( var i = 0; i < summary.revisionList.length; i ++) {
				var revisionArray = summary.revisionList[i].split(':');
				thermostatArray.push({ name : revisionArray[1], thermostatId : revisionArray[0]} );
			}
			
			ecobeeConfig.tokens.refreshTokenExpiredDate = new Date(Date.now() + 9000000);
			saveConfig();

			res.cookie('refreshtoken', tokens.refresh_token, { expires: new Date(Date.now() + 9000000)});
			res.render('thermostats/index', {thermostats : thermostatArray});
		}
	});
  	
  }
};

var authenticate = function (req, callback) {
	var tokens = ecobeeConfig.tokens;
	  
	if (!tokens) {
		api.calls.getPin(config.appKey, 'smartWrite', function(err, pinResults) {
			if(err) {
				callback(false);
			}
			else {
				console.log(pinResults);
				req.session.authcode = pinResults.code;
				req.session.pin = pinResults.ecobeePin;
				req.session.interval = pinResults.interval;

				var authcode = req.session.authcode
					, appKey = config.appKey;
					// , scope = config.scope;
				
					api.calls.registerPin(appKey, authcode, function(err, registerResultObject) {
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
							res.render('login/getpin', {pin: req.session.pin, code: req.session.authcode, interval: req.session.interval, isError: true, tooFast: tooFast,  error: errorMessage});

						} else {
							req.session.tokens = registerResultObject;
							callback(true, req);
							// res.redirect('/thermostats');
						}  	
					});	

				// res.render('login/getpin', {pin: pinResults.ecobeePin, code: pinResults.code, interval:pinResults.interval, isError: false, tooFast : false});
			}
		});					
	} else {
		callback(false);
	}
  }
  

exports.hold = function(req, res) {
	var tokens = ecobeeConfig.tokens
	  , thermostatId = req.params.id
	  , holdTemp = req.param('holdtemp')
	  , hvacMode = req.param('hvacmode')
	  , thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId)
	  , desiredCool = 770 // some defaults for these values
	  , desiredHeat = 690;

	if(hvacMode === 'heat' || hvacMode === 'auxHeatOnly') {
		desiredHeat = parseInt(holdTemp, 10) * 10; // our canonical form is F * 10
	} else {
		desiredCool = parseInt(holdTemp, 10) * 10; // our canonical form is F * 10
	}

	var functions_array = [];
	var set_hold_function = new api.SetHoldFunction(desiredCool, desiredHeat,'indefinite', null);

	var celcius = -32;
	var faranheit = Math.round((celcius * 1.8) + 32);


	thermostats_update_options.thermostat = {
		"settings": {
			"hvacMode": hvacMode
		}
	};

	api.calls.updateThermostats(tokens.access_token, thermostats_update_options, functions_array, null, function(error) {
		if (error) {
			res.redirect('/login');
		}
		else {
			// we set a timeout since it takes some time to update a thermostat. One solution would be to use ajax
			// polling or websockets to improve this further.
			setTimeout(function() {
				res.redirect('/thermostats/' + thermostatId);
			}, 6000)		
		}
	});

}

exports.resume = function(req, res) {
	var tokens = req.session.tokens
	  , thermostatId = req.params.id
	  , thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId)
	  , resume_program_function = new api.ResumeProgramFunction();

	var functions_array = [];
	functions_array.push(resume_program_function);

	api.calls.updateThermostats(tokens.access_token, thermostats_update_options, functions_array, null, function(err) {
		if(err) res.redirect('/login');
		else {
			setTimeout(function() {
				res.redirect('/thermostats/' + thermostatId);
			}, 5000);
		}
	});
}

exports.mode = function(req, res) {
// 	var thermostatId = req.params.id
// 	, holdTemp = req.param('holdtemp')
// 	, hvacMode = req.param('hvacmode')
// 	, thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId)
// 	, desiredCool = 770 // some defaults for these values
// 	, desiredHeat = 690;

//   if(hvacMode === 'heat' || hvacMode === 'auxHeatOnly') {
// 	  desiredHeat = parseInt(holdTemp, 10) * 10; // our canonical form is F * 10
//   } else {
// 	  desiredCool = parseInt(holdTemp, 10) * 10; // our canonical form is F * 10
//   }

//   var functions_array = [];
//   var set_hold_function = new api.SetHoldFunction(desiredCool, desiredHeat,'indefinite', null);

//   var celcius = -32;
//   var faranheit = Math.round((celcius * 1.8) + 32);


//   authenticate(req, function(success, req) {
// 	  console.log("Success " + success);
// 	  var tokens = req.session.tokens;

// 	  if (success) {
// 		  thermostats_update_options.thermostat = {
// 			  "settings": {
// 				  "hvacMode": hvacMode
// 			  }
// 		  };
		  
// 		  api.calls.updateThermostats(tokens.access_token, thermostats_update_options, functions_array, null, function(error) {
// 			  if(error) {
// 				  console.log(error);
// 				  // res.redirect('/login'); // LUCD
// 			  } 
// 			  else {
// 				  // we set a timeout since it takes some time to update a thermostat. One solution would be to use ajax
// 				  // polling or websockets to improve this further.
// 				  setTimeout(function() {
// 					  res.redirect('/thermostats/' + thermostatId);
// 				  }, 6000)		
// 			  }
// 		  });
// 	  }
//   });

  var thermostatId = req.params.id
	, holdTemp = req.param('holdtemp')
	, hvacMode = req.param('hvacmode')

  var thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId);
  var functions_array = [];

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
}

exports.view = function(req, res) {
	//var tokens = req.session.tokens
	var tokens = ecobeeConfig.tokens
	  , thermostatId = req.params.id
	  , thermostatsOptions = new api.ThermostatsOptions(thermostatId);

	if(!tokens) {
		res.redirect('/login');
	} else {
		api.calls.thermostats(tokens.access_token, thermostatsOptions, function(err, thermostats) {
			if(err) res.redirect('/');
			else {

				var thermostat = thermostats.thermostatList[0]
				  , currentTemp = Math.round(thermostat.runtime.actualTemperature / 10)
				  , currentTempCelcius = (currentTemp - 32) / 1.8
				  , desiredHeat = Math.round(thermostat.runtime.desiredHeat / 10)
				  , desiredHeatCelcius = (desiredHeat - 32) / 1.8
				  , desiredCool = Math.round(thermostat.runtime.desiredCool / 10)
				  , hvacMode = thermostat.settings.hvacMode
				  , desiredTemp = null
				  , isHold = false
				  , thermostatId = thermostat.identifier
				  , name = thermostat.name
				  , compressorProtectionMinTemp = Math.round(thermostat.settings.compressorProtectionMinTemp / 10)
				  , compressorProtectionMinTempCelsius = Math.round((compressorProtectionMinTemp - 32) / 1.8)
				  , heatRangeLow = Math.round(thermostat.settings.heatRangeLow / 10)
				  , coldTempAlert = Math.round(thermostat.settings.coldTempAlert / 10)
				  , template = null;

				isHold = thermostat.events.length > 0;
				switch(hvacMode) {
					case 'heat':
						desiredTemp = desiredHeat;
						template = 'thermostats/show';
						break;
					case 'cool':
						desiredTemp = desiredCool;
						template = 'thermostats/show';
						break;
					case 'auto':
						desiredTemp = desiredHeat + ' - ' + desiredCool;
						template = 'thermostats/automode';
						break;
					case 'off':
						desiredTemp = 'Off'
						template = 'thermostats/off';
						break;
					case 'auxHeatOnly':
						desiredTemp = desiredHeat;
						template = 'thermostats/show';
						break;
				} 
				
				res.render(template, {thermostat : thermostat, 
												currentTemp : compressorProtectionMinTempCelsius,
												desiredTemp : desiredTemp,
												hvacMode : hvacMode,
												isHold : isHold,
												thermostatId : thermostatId,
												name : name});
				
			}
		});
	}
}