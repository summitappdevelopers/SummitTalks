/*
	TODO: Disconnect users when room dies
		  Switching between rooms fast kills MongoDB
*/

var io = app.modules.io
var socketioJwt = app.modules.socketJwt;
var _ = app.utilities.lodash;

io.set('authorization', socketioJwt.authorize({
  secret: app.secrets.jwtSecret,
  handshake: true
}));

io.on('connection', function(socket){

	var profile = socket.client.request.decoded_token;
	
	socket.on('joinroom', function(data){
		socket.join(data.roomName);
		console.log(profile.displayName+" joined "+data.roomName);
		io.to(data.roomName).emit('inupdatemembers',{members:currentMembersInRoom(data.roomName)});

	});

	socket.on('outdeleteroom', function(data){
		console.log(profile.displayName+" deleted "+data.roomName);
		io.sockets.emit('indeleteroom',data);
	});

	socket.on('outcreateroom', function(data){
		console.log(profile.displayName+" created "+data.roomName);
		io.sockets.emit('increateroom',data);
	});

	socket.on('outmessage', function(data){
		if(data.content.length>0){
			data.content = data.content.replace(/(<([^>]+)>)/ig,"");
			saveMessage(data, function(message){
				io.to(data.roomName).emit('inmessage',{content:message.content, _id: message._id, sender: profile,sendTime:new Date(), replies:[]});
			});
		}
	});

	socket.on('outreply', function(data){
		if(data.content.length>0){
			data.content = data.content.replace(/(<([^>]+)>)/ig,"");
			saveMessage(data, function(message){
				io.to(data.roomName).emit('inreply', {content:message.content, _id: message._id, sender:profile, sendTime: new Date(), parentId: message.parentId});
			});
		}
	});

	socket.on('outmuteroom', function(data){
		console.log(profile.displayName+" muted "+data.roomName);
		io.to(data.roomName).emit('inmuteroom',data.isMute);
	});

	socket.on('willdisconnect', function(room){
		console.log(profile.displayName+" left "+data.roomName);
		socket.disconnect();
		io.to(room).emit('inupdatemembers',{members:currentMembersInRoom(room)});
	});


	function currentMembersInRoom(room, callback){
		var currentMembers = [];
		for(var sockID in io.nsps['/'].adapter.rooms[room]){
			currentMembers.push(io.sockets.connected[sockID].client.request.decoded_token);
		}
		return _.unique(currentMembers, function(user){
			return user._id;
		});
	}

	function saveMessage(data, callback){
		var newMessage = new app.models.Message();
		newMessage.content = data.content;
		newMessage.sender = profile._id;
		newMessage.roomId = data.roomId;
		newMessage.sendTime = new Date();
		if(data.parentId){
			newMessage.parentId = data.parentId;
			app.models.Message.findByIdAndUpdate(
		        data.parentId,
		        { "$push": { "replies": newMessage._id } },
		        function(err,message) {
		        	if(err) throw err;
		        }
      		);
		}
		newMessage.save(function(err){
			if(err) throw err;
			callback(newMessage);
		});
	}

});
