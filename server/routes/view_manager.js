var view_manager = app.modules.express.Router();

view_manager.route('/').get(function(req,res){
	if(req.user){
		res.render('rooms',{profile:req.user,version:app.version});
	}else{
		res.render('landing',{version: app.version});
	}
});

view_manager.route('/room/:roomName').get(app.utilities.ensureAuthenticated,function(req,res){
	app.models.Room.findOne({roomName:req.params.roomName}, function(err,room){
		
		app.models.Room.populate(room, {path:'creator'}, function(err, room){
			if(room){
				res.render('talk',{room:room, token:app.modules.jwt.sign(req.user,app.secrets.jwtSecret), profile:req.user,dev:app.dev});
			}else{
				res.send("<h1>Room not found!</h1></br><img src='http://i.imgur.com/Th7ygxu.gif'></br><a href='/'>Click here to go back to rooms</a></br></br>I put this here to debug and probably forgot about it...");
			}
		});

	});
});

module.exports = view_manager;
