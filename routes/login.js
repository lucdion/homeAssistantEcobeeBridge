var api = require('../ecobee-api')
, config = require('../config');

validateCookieRefreshToken = function() {
	if (ecobeeConfig.cookies && ecobeeConfig.cookies.cookieExpiredDate) {
		var cookieExpiredDate = new Date(ecobeeConfig.cookies.cookieExpiredDate);
		var currentDate = new Date(Date.now());
		if (currentDate > cookieExpiredDate) {
			delete ecobeeConfig.cookies.cookieExpiredDate;
			delete ecobeeConfig.cookies.cookieRefreshtoken;
		}
	}
}

exports.list = function(req, res){
	validateCookieRefreshToken();

	var tokens = ecobeeConfig.tokens
		, cookie_refresh = ecobeeConfig.tokens.cookieRefreshtoken;
	
	if (cookie_refresh || tokens) { // have we already authenticated before? 
		var refresh_token = cookie_refresh || tokens.refresh_token;
		
		api.calls.refresh(refresh_token, function(err, registerResultObject) {
			if(err) { // if we error refreshing the token clear session and re-log
				// req.session.destroy();
				delete ecobeeConfig.cookies;
				saveConfig();
				
				res.redirect('/login/getpin');
			} else { // refresh of the tokens was successful to we can proceed to the main app
				// req.session.tokens = registerResultObject;
				
				ecobeeConfig.tokens = registerResultObject;
				saveConfig();
				
				res.redirect('/thermostats');
			}  	
		});
	} else {
		res.redirect('/login/getpin');
	}
};

exports.create = function(req, res) {
	// get the users login credentials
	var authcode = req.param('authcode')
	, appKey = config.appKey
	, scope = config.scope;
	
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
			// req.session.tokens = registerResultObject;
			
			ecobeeConfig.tokens = registerResultObject;
			saveConfig();
			
			res.redirect('/thermostats');
		}  	
	});	
}
exports.error = function(req, res) {
	res.render('login/error');
},
exports.getpin = function(req, res) {
	var scope = 'smartWrite'
	, client_id = config.appKey;
	
	api.calls.getPin(client_id, scope, function(err, pinResults) {
		if(err) res.redirect('/login/error');
		else {
			console.log(pinResults);
			req.session.authcode = pinResults.code;
			req.session.pin = pinResults.ecobeePin;
			req.session.interval = pinResults.interval;
			
			ecobeeConfig.session = {
				"authcode": pinResults.code,
				"pin": pinResults.ecobeePin,
				"interval": pinResults.interval
			};
			saveConfig();
			res.render('login/getpin', {pin: pinResults.ecobeePin, code: pinResults.code, interval:pinResults.interval, isError: false, tooFast : false});
		}
	});	
}