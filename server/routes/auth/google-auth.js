var googleAuth = app.modules.express.Router();

var GoogleStrategy = app.modules.googleStrategy.OAuth2Strategy;
var GOOGLE_CLIENT_ID = "764510630822-clsfk29gnm6n3bgiur9uc0l5qm7ss6ft.apps.googleusercontent.com";
var GOOGLE_CLIENT_SECRET = "Dmh6kWGILQ1DpHM5_jGSsT3Z";
var callbackURL;

if(app.dev){
	callbackURL = "http://localhost:1337/auth/google/callback";
}else{
	callbackURL = "https://summittalks.herokuapp.com/auth/google/callback";
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