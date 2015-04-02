var _CONFIG_ = app.utilities.config;
var googleAuth = app.modules.express.Router();
var GoogleStrategy = app.modules.googleStrategy.OAuth2Strategy;
var GOOGLE_CLIENT_ID = _CONFIG_.auth.g_client_id;
var GOOGLE_CLIENT_SECRET = _CONFIG_.auth.g_client_;
var callbackURL;

if(app.dev){
	callbackURL = "http://localhost:"+app.port+"/auth/google/callback";
}else{
	callbackURL = _CONFIG_.auth.g_callback_url;
}

var passport = app.modules.passport;

passport.use(new GoogleStrategy({
		clientID: GOOGLE_CLIENT_ID,
		clientSecret: GOOGLE_CLIENT_SECRET,
		callbackURL: callbackURL
	},
	function(accessToken,refreshToken,profile,done) {
		app.models.User.findOne({google_id:profile.id}, function(err,user){

			if(err){
				return done(err);
			}

			if(user){
				return done(null,user);
			}else{
				if(profile._json.hd=="summitps.org" || profile._json.hd=="mysummitps.org"){
					var isTeacher = false;
					if(profile._json.hd=="summitps.org" || profile.emails[0].value=="dev.tahoma@mysummitps.org"){
						isTeacher = true;
					}
					var newUser = new app.models.User({
						google_id: profile.id,
						displayName: profile.displayName,
						email: profile.emails[0].value,
						picture: profile._json.picture,
						isTeacher: isTeacher
					});

					newUser.save(function(err){
						if(err){
							throw err;
						}
						return done(null,newUser);
						});
				}else{
					return done("Sorry, only summit emails allowed.");
				}
			}
		});
	}
));

googleAuth.route('/')
	.get(passport.authenticate('google', {scope:['https://www.googleapis.com/auth/userinfo.profile','https://www.googleapis.com/auth/userinfo.email']}),
		function(req,res){

		});

googleAuth.route('/callback')
	.get(passport.authenticate('google',{failureRedirect:'/'}),
		function(req,res){
			res.redirect('/');
		});


module.exports = googleAuth