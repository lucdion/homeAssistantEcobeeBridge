var api = require('../ecobee-api')
, config = require('../config');

exports.list = function(req, res){
	var tokens = ecobeeConfig.tokens;
	
	if (!tokens) {
		res.redirect('/login');
	}  
	else {
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
				
				ecobeeConfig.cookies = {
					"cookieRefreshtoken": tokens.refresh_token,
					"cookieExpiredDate": new Date(Date.now() + 9000000)
				};
				saveConfig();
				
				res.cookie('refreshtoken', tokens.refresh_token, { expires: new Date(Date.now() + 9000000)});
				res.render('thermostats/index', {thermostats : thermostatArray});
			}
		});
	}
};

// var authenticate = function (req, callback) {
// 	var tokens = ecobeeConfig.tokens;

// 	if (!tokens) {
// 		api.calls.getPin(config.appKey, 'smartWrite', function(err, pinResults) {
// 			if(err) {
// 				callback(false);
// 			}
// 			else {
// 				console.log(pinResults);
// 				req.session.authcode = pinResults.code;
// 				req.session.pin = pinResults.ecobeePin;
// 				req.session.interval = pinResults.interval;

// 				var authcode = req.session.authcode
// 					, appKey = config.appKey;
// 					// , scope = config.scope;

// 					api.calls.registerPin(appKey, authcode, function(err, registerResultObject) {
// 						var tooFast = false;
// 						if(err) {
// 							var errorMessage = '';

// 							console.log(err)
// 							if(err.data && err.data.error && err.data.error === 'slow_down') {
// 								errorMessage = 'Polling too fast: Please wait ' + req.session.interval + ' seconds before attempting to complete the link again.';
// 								tooFast = true;
// 							} else { 
// 								errorMessage = 'you must first authorize the app on your ecobee portal settings page. Then click the complete link button below.';
// 							}
// 							res.render('login/getpin', {pin: req.session.pin, code: req.session.authcode, interval: req.session.interval, isError: true, tooFast: tooFast,  error: errorMessage});

// 						} else {
// 							req.session.tokens = registerResultObject;
// 							callback(true, req);
// 							// res.redirect('/thermostats');
// 						}  	
// 					});	

// 				// res.render('login/getpin', {pin: pinResults.ecobeePin, code: pinResults.code, interval:pinResults.interval, isError: false, tooFast : false});
// 			}
// 		});					
// 	} else {
// 		callback(false);
// 	}
// }


authenticate = function(cb) {
	validateCookieRefreshToken();

	var tokens = ecobeeConfig.tokens
	, cookie_refresh = ecobeeConfig.cookies.cookieRefreshtoken;
		
	if (cookie_refresh || tokens) { // have we already authenticated before? 
		var refresh_token = cookie_refresh || tokens.refresh_token;
		
		api.calls.refresh(refresh_token, function(err, registerResultObject) {
			if (err) { // if we error refreshing the token clear session and re-log
				// req.session.destroy();
				
				delete ecobeeConfig.cookies;
				saveConfig();

				// res.redirect('/login/getpin');
				cb(false, "Cannot refresh token. You should create a new PIN. Go to http://localhost:3000/");
			} else { // refresh of the tokens was successful to we can proceed to the main app
				// req.session.tokens = registerResultObject;
				
				ecobeeConfig.tokens = registerResultObject;
				saveConfig();
				
				cb(true, "Success");
			}  	
		});
	} else {
		// res.redirect('/login/getpin');
		cb(false, "No PIN has been requested yet. Go to http://localhost:3000/");
	}
};


exports.hold = function(req, res) {
	var tokens = ecobeeConfig.tokens
		, thermostatId = req.params.id
		, holdTemp = req.param('holdtemp')
		, hvacMode = req.param('hvacmode')
		, thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId)
		, functions_array = [];
	
	if (holdTemp) {
		// some defaults for these values
		var desiredCool = 824;  // 28 celcius
		var desiredHeat = 590;  // 15 celcius
		var holdTempCelcius = parseFloat(holdTemp, 10);
		var holdTempFarenheit = holdTempCelcius * (9/5) + 32;
		var holdTempFarenheitAdjusted = Math.round(holdTempFarenheit * 10); // canonical form is F * 10
		
		if (hvacMode === 'heat' || hvacMode === 'auxHeatOnly') {
			desiredHeat =  holdTempFarenheitAdjusted;
		} else {
			desiredCool = holdTempFarenheitAdjusted; 
		}
		
		var set_hold_function = new api.SetHoldFunction(desiredCool, desiredHeat,'indefinite', null);
		functions_array.push(set_hold_function);
	}
	
	thermostats_update_options.thermostat = {
		"settings": {
			"hvacMode": hvacMode
		}
	};
	
	api.calls.updateThermostats(tokens.access_token, thermostats_update_options, functions_array, null, function(error) {
		if (error) {
			authenticate(function (success, message) {
				if (success) {
					// Token refres success => retry to set hold
					exports.hold(req, res);
				}
				else {
					var msg = "Cannot refresh token";
					if (message) {
						msg = message;
					}
					res.status(404).send(msg);
				}
			})
		}
		else {
			// we set a timeout since it takes some time to update a thermostat. One solution would be to use ajax
			// polling or websockets to improve this further.
			setTimeout(function() {
				// res.redirect('/thermostats/' + thermostatId);
				res.status(200).send('Success');
			}, 6000)		
		}
	});
}

exports.resume = function(req, res) {
	// var tokens = req.session.tokens
	var tokens = ecobeeConfig.tokens
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