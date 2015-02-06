/*
	TODO: Disconnect users when room dies
		  Switching between rooms fast kills MongoDB
*/

var io = app.modules.io
var socketioJwt = app.modules.socketJwt;

io.set('authorization', socketioJwt.authorize({
  secret: app.secrets.jwtSecret,
  handshake: true
}));

io.on('connection', function(socket){

	var profile = socket.client.request.decoded_token;
	
	socket.on('joinroom', function(data){

		app.models.Room.findOne({roomName: data.roomName}).populate('creator').exec(function(err, room){
	
			if(room){

				socket.join(data.roomName);

				/* Check if user is already connected to the room, but has opened another instance (ie. tabs) */

				var userExists = false;
				for(var m=0; m<room.members.length; m++){
					if(room.members[m]._id == profile._id){
						console.log(profile.displayName+" connected again to "+room.roomName);
						var userExists = true;
						break;
					}
				}

				/* Add user to room.members if it is their first time joining */
				
				if(!userExists){
					room.members.push(profile);
					room.save(function(err){
						socket.broadcast.to(data.roomName).emit('userjoin', profile);
						if(err) throw err;
					});
					console.log(profile.displayName+" connected to "+room.roomName);
				}

			}

		});
	});

	socket.on('outdeleteroom', function(data){
		io.sockets.emit('indeleteroom',data);
	});

	socket.on('outcreateroom', function(data){
		io.sockets.emit('increateroom',data);
	});

	socket.on('outmessage', function(data){
		if(data.content.length>0){
			data.content = data.content.replace(/(<([^>]+)>)/ig,"");
			saveMessage(data, function(message){
				io.to(data.roomName).emit('inmessage',{content:message.content, _id: message._id, sender: profile,sendTime:new Date()});
			});
		}
	});

	socket.on('outmuteroom', function(data){
		io.to(data.roomName).emit('inmuteroom',data.isMute);
	});


	/*
		Client will send the list of all the rooms it is connected to when closing the window.
	*/

	socket.on('willdisconnect', function(data){
		console.log(data);
		app.models.Room.find({roomName: {$in: data}}, function(err, rooms){
			for(var i in rooms){
				var room = rooms[i];
				var instances = 0;
				/*
					Check if client is disconnecting from an instance of a room (ie. tabs)
					The client should only truly "disconnect" if it closed its last instance of the room
				*/
				for(var sockID in io.nsps['/'].adapter.rooms[room.roomName]){
					if(io.sockets.connected[sockID].client.request.decoded_token._id==profile._id){
						instances+=1;
					}
				}
				if(instances==1){
					/*
						Remove the right user from the list of users
					*/
					for(var j in room.members){
						if(room.members[j]._id==profile._id){
							room.members.splice(j,1);
							room.save(function(err, room){
								if(err) throw err;
								console.log("Fully disconnecting "+profile.displayName+" from "+room.roomName);
								socket.broadcast.to(room.roomName).emit('userleave', profile._id);
								socket.disconnect();
							});
							break;
						}
					}
				}
			}
		});
	});

	function saveMessage(data, callback){
		var newMessage = new app.models.Message();
		newMessage.content = data.content;
		newMessage.sender = profile._id;
		newMessage.roomId = data.roomId;
		newMessage.sendTime = new Date();
		if(data.parentId) newMessage.parent = app.modules.mongoose.Schema.Types.ObjectId(data.parentId);
		newMessage.save(function(err){
			if(err) throw err;
			callback(newMessage);
		});
	}

});
