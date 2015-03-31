//====== APP SETUP ======

global.app = {
	express: {},
	router: {},
	modules: {},
	utilities: {},
	models: {},
	secrets: {
		expressSession: "scheminup",
		jwtSecret: "topszn"
	},
	dev: false,
	port: {},
	mongo_uri: {},
	version: {},
}

if(process.argv[2]=="dev"){
	app.dev = true;
}

app.port = (process.env.PORT || 1337);
var d = new Date();
app.version = "v"+d.getFullYear()+"."+d.getMonth()+1+"."+d.getDate();

if(app.dev){
	app.mongo_uri ="mongodb://localhost:27017/summit-talks-dev";
}else{
	app.mongo_uri ="mongodb://heroku_app33201011:ka4anhdnpjbcklnsdt7n188o8h@ds031741.mongolab.com:31741/heroku_app33201011";
}

app.utilities.ensureAuthenticated = function ensureAuthenticated(req,res,next) {
	if (!req.user) {
		res.redirect('/auth/google');
		return;
	}
	next();
}

app.modules.http = require('http');
app.modules.fs = require('fs');
app.modules.express = require('express');
app.modules.session = require('express-session');
app.modules.mongoose = require('mongoose');
app.modules.cookieParser = require('cookie-parser');
app.modules.bodyParser = require('body-parser');
app.modules.methodOverride = require('method-override');
app.modules.passport = require('passport');
app.modules.util = require('util');
app.modules.ejs = require('ejs');
app.modules.googleStrategy = require('passport-google-oauth');
app.modules.moment = require('moment');
app.modules.jwt = require('jsonwebtoken');
app.modules.socketJwt = require('socketio-jwt');
app.utilities.api_manager = require('./routes/api_manager');
app.utilities.auth = require('./routes/auth/auth');
app.utilities.view_manager = require('./routes/view_manager');
app.utilities.path = require('path');
app.utilities.lodash = require('lodash');
app.utilities.mongooseDeepPopulate = require('mongoose-deep-populate');

//====== MONGODB SETUP ======

app.modules.mongoose.connect(app.mongo_uri);

app.models.Room = require('./models/Room');
app.models.Message = require('./models/Message');
app.models.User = require('./models/User');

//====== EXPRESS SETUP ======
app.express = app.modules.express();
app.modules.server = app.modules.http.createServer(app.express);
app.express.use(app.modules.session({secret:app.secrets.expressSession, resave: true, saveUninitialized: true}));
app.express.use(app.modules.cookieParser());
app.express.use(app.modules.bodyParser.urlencoded({'extended':'true'}));
app.express.use(app.modules.bodyParser.json());
app.express.use(app.modules.methodOverride());
app.express.use(app.modules.passport.initialize());
app.express.use(app.modules.passport.session());
app.express.use('/js', app.modules.express.static(__dirname + '/../public/js/'));
app.express.use('/css', app.modules.express.static(__dirname + '/../public/stylesheets/css/'));
app.express.use('/images', app.modules.express.static(__dirname + '/../public/images/'));
app.express.use('/public',app.modules.express.static(__dirname+ '/../public/'));
app.express.use('/api',app.utilities.api_manager);
app.express.use('/auth',app.utilities.auth);
app.express.use('/',app.utilities.view_manager);
app.express.set('view engine','html');
app.express.engine('html', require('ejs').renderFile);
app.express.set('views',__dirname + '/views');


app.modules.passport.serializeUser(function(user,done){
	done(null,user._id);
});

app.modules.passport.deserializeUser(function(id,done){
	app.models.User.findOne({_id:id}, function(err, user){
		done(err,user);
	});
});


app.modules.server.listen(app.port);
app.modules.io = require('socket.io')(app.modules.server);
app.utilities.talkSocket = require('./utilities/socket');

app.modules.mongoose.connection.on('disconnected', function(){
	console.log("DISCONNECTING MONGOOSE");
});

app.utilities.cleanupHandler = function(){
	console.log("Disconnecting all sockets...");
	app.modules.io.sockets.sockets.forEach(function (socket) {
		socket.disconnect();
	});
	console.log("Done!");
	console.log("Shutting down, bye!");
	process.exit();
}

console.log("App listening on port: "+app.port+" Dev Mode: "+app.dev);

process.on('SIGINT', app.utilities.cleanupHandler);
process.on('SIGTERM', app.utilities.cleanupHandler);