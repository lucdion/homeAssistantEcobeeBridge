ecobee API Demo
====================

The ecobee API demo is a sample app that uses ecobee's api and serves as an example of how to perform authentication and simple requests.

Installation
==================

If you don't have node.js installed you can get it at http://nodejs.org for your platform. 

Getting an API Key
===================

Visit  http://www.ecobee.com/home/developer/loginDeveloper.jsp and sign up as a developer. Once you have completed that process you will have a developer tab available to you in your web portal. There you can generate an application key for your app.

To make the sample applciation work you will need to add your API key to the exports.appKey property in the config.js file located at the root of the application.

Running The Application
=========================

To run the application in your terminal window run npm install to ensure all dependencies are installed. Once these have been installed run: node app.js 

This will start a node server running on port 3000. You can view the app in your web browser by visiting http://localhost:3000

Application Architecture
==========================

The main entry point of the application is the app.js file. This is where all of the endpoints are defined for both get and post requests.

The implementation for the login related endpoints can be found in /routes/login.js
The implementation for the thermostat related endpoints can be found in /routes/thermostats.js

Views that get loaded by the various endpoints can likewise be found in /views/

Logic that speaks directly to the ecobee servers is all encapsulated in the ecobee-api.js file. This is an implementation of the api itself. For more API documentation please see http://ecobee.com/home/developer/api/documentation/v1/index.shtml

