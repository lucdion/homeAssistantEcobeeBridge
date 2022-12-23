var config = require('./test-config')
  , api = require('../ecobee-api')
  , expect = require('expect.js')
  , tokens = null;

 function register(callback) {
 	var username = 'alan@ecobee.com'
		  , password = 'qqqqqqqq'
		  ,	appKey = config.appKey
		  , scope = config.scope
		  , registerOptions = new api.RegisterOptions(username, password, appKey, scope);

		  api.calls.register(registerOptions, function(err, registerResultObject) {
		  	if(err) callback(err)
		  	else {
		  		callback(null, registerResultObject);
		  	}
		  });
 };

describe('API test', function() {
	beforeEach(function(done) {
		register(function(err, regObj) {
			if(err) done(err);
			else {
				tokens = regObj;
				done();
			}
		})
	});

	it('makeRequest() should make a http get request', function(done) {
		var options = {
			  host: 'www.random.org',
			  path: '/integers/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'
		};

		api.calls.makeRequest(options, null, false, function(err, data) {
			expect(err).to.be(null);
			console.log(data);
			expect(data.length).to.not.be();
			done();
		})
	});

	it('makeRequest() should make a https get request', function(done) {
		var options = {
			  host: 'www.google.com',
			  path: '/'
		};

		api.calls.makeRequest(options, null, true, function(err, data) {
			expect(err).to.be(null);
			console.log(data);
			expect(data.length).to.not.be(0);
			done();
		})
	});

	it('getPin() should return a pin number for a valid application ID', function(done) {
		var appId = config.appKey
		  , scope = config.scope;
		api.calls.getPin(appId, scope, function(err, pinResultObject) {
			console.log(pinResultObject)
			expect(err).to.be(null);
			expect(pinResultObject).to.not.be(null);
			done();
		});
	});

	it('register() should register the user with vaild username password combination', function(done) {
		var username = 'alan@ecobee.com'
		  , password = 'qqqqqqqq'
		  ,	appKey = config.appKey
		  , scope = config.scope
		  , registerOptions = new api.RegisterOptions(username, password, appKey, scope);

		  api.calls.register(registerOptions, function(err, registerResultObject) {
		  	console.log(registerResultObject);
		  	expect(err).to.be(null);
		  	expect(registerResultObject).to.not.be(null);
		  	done();
		  });
	});

	it('thermostatSummary() should return a summary object for a valid user token', function(done) {
		var thermostatSummaryOptions = new api.ThermostatSummaryOptions();
		console.log("tokens >>>>" + tokens)
		api.calls.thermostatSummary(tokens.access_token, thermostatSummaryOptions, function(err, summary) {
			console.log(summary);
			expect(err).to.be(null);
			expect(summary).to.not.be(null);
			done();
		});
	});

	it('thermostat() should retrieve a thermostat for a valid thermostatID', function(done) {
		
		var thermostatsOptions = new api.ThermostatsOptions(config.test.thermostatId);
		api.calls.thermostats(tokens.access_token, thermostatsOptions, function(err, thermostats) {
			console.log(thermostats)
			expect(err).to.be(null);
			expect(thermostats).to.not.be(null);
			done();
		});
	});

	it('updateThermostats() when setting a hold should update the thermostat correctly', function(done) {
		this.timeout(10000)
		var thermostats_update_options = new api.ThermostatsUpdateOptions(config.test.thermostatId);
		
		
		var desiredCool = 770;
		var desiredHeat = 690;
		var set_hold_function = new api.SetHoldFunction(desiredCool, desiredHeat,'indefinite', null);

		var functions_array = [];
		functions_array.push(set_hold_function);

		api.calls.updateThermostats(tokens.access_token, thermostats_update_options, functions_array, null, function(error) {
			if(error) done(error);
			else {
				console.log('start timeout')
				setTimeout(
				function() {getThermostat(config.test.thermostatId, function(error, data) {
					if(error) done(error);
					else {
						console.log('done timeout')	
						expect(data.thermostatList[0].runtime.desiredCool).to.be(desiredCool);
						expect(data.thermostatList[0].runtime.desiredHeat).to.be(desiredHeat);
						// expect(data.status.code).to.be(0);
						done();
					}
				})}, 5000);
				
		
				
			}
		});
		
	});

	it('updateThermostats() resumes properly', function(done) {
		resumeThermostat(config.test.thermostatId, function(error) {
			if(error) done(error);
			else {
				getThermostat(config.test.thermostatId, function(error, data) {
					if(error) done(error);
					else {
						
						console.log('resume', data);
						done();
					}
				});	
			}
		});
	});

	/** HELPER FUNCTIONS **/
	function getThermostat(thermostatId, callback) {
		var thermostatsOptions = new api.ThermostatsOptions();
		thermostatsOptions.selection.selectionMatch  = thermostatId;
		api.calls.thermostats(tokens.access_token, thermostatsOptions, function(error, data) {
			if(error) callback(error);
			else {
				callback(null, data);
			}
		}); 
	};

	function resumeThermostat(thermostatId, callback) {
		var thermostats_update_options = new api.ThermostatsUpdateOptions(thermostatId);
		var resume_program_function = new api.ResumeProgramFunction();

		var functions_array = [];
		functions_array.push(resume_program_function);
		functions_array.push(resume_program_function);
		functions_array.push(resume_program_function);

		api.calls.updateThermostats(tokens.access_token, thermostats_update_options, functions_array, null, callback);
	};
});