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
	dev: {
		port: 1337
	},
	version: 'v2014.01.10.1'
}

app.utilities.ensureAuthenticated = function ensureAuthenticated(req,res,next) {
	if (!req.user) {
		res.redirect('/auth/google');
		return;
	}

	next();
}

app.modules.http = require('http');
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

//====== MONGODB SETUP ======

if(process.env.OPENSHIFT_MONGODB_DB_URL){
	if(process.env.OPENSHIFT_MONGODB_DB_PASSWORD){
		mongodb_connection_string = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
		process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
		process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
		process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
		process.env.OPENSHIFT_APP_NAME;
	}
}

app.modules.mongoose.connect(mongodb_connection_string);

app.models.Room = require('./models/Room');
app.models.Message = require('./models/Message');
app.models.User = require('./models/User');

//====== EXPRESS SETUP ======
app.express = app.modules.express();
app.modules.server = app.modules.http.createServer(app.express);
app.express.use(app.modules.session({secret:app.secrets.expressSession}));
app.express.use(app.modules.cookieParser());
app.express.use(app.modules.bodyParser.urlencoded({'extended':'true'}));
app.express.use(app.modules.bodyParser.json());
app.express.use(app.modules.methodOverride());
app.express.use(app.modules.passport.initialize());
app.express.use(app.modules.passport.session());
app.express.use('/js', app.modules.express.static(__dirname + '/../public/js/'));
app.express.use('/css', app.modules.express.static(__dirname + '/../public/stylesheets/css/'));
app.express.use('/images', app.modules.express.static(__dirname + '/../public/images/'));
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

app.modules.server.listen(parseInt(process.env.OPENSHIFT_NODEJS_PORT),process.env.OPENSHIFT_NODEJS_IP);
app.modules.io = require('socket.io')(app.modules.server);
app.utilities.talkSocket = require('./utilities/socket');

process.on('SIGINT', function() {
	console.log("Disconnecting all sockets...");
	app.modules.io.sockets.sockets.forEach(function (socket) {
		socket.disconnect();
	});
	console.log("Done...");
	console.log("Shutting down, bye!");
	process.exit();
});