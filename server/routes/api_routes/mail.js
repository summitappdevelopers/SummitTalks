var mail = app.modules.express.Router();
var mandrill_client = new app.modules.mandrill.Mandrill('KslfFoq1VJsYdFavUoHEGA');

mail.route('/send').post(app.utilities.ensureAuthenticated, function(req,res){
	if(req.user.isTeacher){

		var to = [];

		for(var i=0; i<req.body.invitees.length;i++){
			to.push({
				'email':req.body.invitees[i],
				'type':'to'
			});
		}

		var html_string ="<html><body style='margin-top:0;margin-bottom:0;margin-right:0;margin-left:0;padding-top:0;padding-bottom:0;padding-right:0;padding-left:0;background-color:#ECF0F1'><div class='header' style='width:100%;height:57px;background-color:#22313F;font-family:Lato,sans-serif;font-size:24px;color:#fff;text-align:center'><h1>Summit Talks</h1></div><div class='content' style='padding-top:20px;padding-bottom:20px;padding-right:20px;padding-left:20px;color:#6C7A89;font-family:Lato,sans-serif'><h1>You're invited!</h1><p style='font-size:18px !important;'>"+req.user.displayName+" has invited you to join "+req.body.roomDisplay+"!</p><a href='summittalks.herokuapp.com/#"+req.body.roomName+"' style='text-decoration:none'><p style='position:relative !important;font-family:Lato,sans-serif;font-size:24px;color:#fff;top:10px !important;background-color:#3FC380;padding:10px;width:130px'>Click to Join</p></a><h3>What is this?</h3><p>Summit Talks is a 'Student Driven, Teacher Moderated' group chat service. You've been invited to join a discussion room regarding "+req.body.roomDisplay+" with your teacher and other students. First time? Just login with your Google account, and we'll take care of the rest. <a href='https://summittalks-blog.herokuapp.com/welcome/' style='text-decoration:none'>Learn more.</a></p></div>";

		var message = {
			'html': html_string,
			'subject': 'New Summit Talks Invite!',
			'from_email':'dev.tahoma@mysummitps.org',
			'from_name':'Summit Talks',
			'to': to
		}

		mandrill_client.messages.send({'message':message},function(result){
			res.json({status:'Sent'});
		}, function(e){
			console.log(e);
		});

		console.log(req.body.invitees,req.body.roomName,req.body.roomDisplay);
	}else{
		res.json({
			message: 'Only teachers can send invites',
			data: null
		});
	}
});

module.exports = mail;