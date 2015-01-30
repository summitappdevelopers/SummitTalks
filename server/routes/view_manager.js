var view_manager = app.modules.express.Router();

view_manager.route('/').get(function(req,res){
	if(req.user){
		res.render('talk',{token:app.modules.jwt.sign(req.user,app.secrets.jwtSecret), profile:req.user,dev:app.dev});
	}else{
		res.render('landing',{version: app.version});
	}
});

module.exports = view_manager;
