var mail = app.modules.express.Router();
var mandrill_client = new app.modules.mandrill.Mandrill('KslfFoq1VJsYdFavUoHEGA');

mail.route('/send').post(app.utilities.ensureAuthenticated, function(req,res){
	if(req.user.isTeacher){

		var to = [];

		for(var i=0; i<req.body.invitees.length;i++){
			to.push({
				"email":req.body.invitees[i],
				"type":"to"
			});
		}
		
		var message = {
			"html": req.user.displayName+" has invited you to join "+"<a href='summittalks.herokuapp.com/#"+req.body.roomName+"'>"+req.body.roomDisplay+"</a>",
			"subject": "New Summit Talks Invite!",
			"from_email":"dev.tahoma@mysummitps.org",
			"from_name":"Summit Talks",
			"to": to
		}

		console.log(message.html);

		mandrill_client.messages.send({"message":message},function(result){
			console.log(result);
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