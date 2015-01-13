var auth = app.modules.express.Router();

auth.use('/google',require('../../routes/auth/google-auth'));

auth.route('/logout').get(function(req,res){
	req.logout();
	res.redirect('/');
});

module.exports = auth;