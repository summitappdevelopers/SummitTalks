var message = app.modules.express.Router();


message.route('/delete').post(app.utilities.ensureAuthenticated, function(req,res){
	if(req.user.isTeacher){
		app.models.Message.remove({parentId: req.body.messageId}, function(err){
			if(err) throw err;
		});
		app.models.Message.remove({_id:req.body.messageId}, function(err){
			if(err) throw err;
			res.json('Removed message');
		});
	}else{
		res.json({
			message: 'Only teachers can delete messages',
			data: null
		});
	}
});

module.exports = message;