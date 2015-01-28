var auth = app.modules.express.Router();

auth.use('/google',require('../../routes/auth/google-auth'));

auth.route('/logout').get(function(req,res){

	for(var i in app.modules.io.sockets.sockets){
		if(app.modules.io.sockets.sockets[i].client.request.decoded_token._id==req.user._id){
			app.modules.io.sockets.sockets[i].disconnect();
			break;
		}
	}

	req.logout();
	res.redirect('/');
});

module.exports = auth;