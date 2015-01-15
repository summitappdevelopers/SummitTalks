/*
	TODO: Disconnect users when room dies
*/

var io = app.modules.io
var socketioJwt = app.modules.socketJwt;

io.set('authorization', socketioJwt.authorize({
  secret: app.secrets.jwtSecret,
  handshake: true
}));

io.sockets.on('connection',function(socket){

	/* Get the following metadata from socket */	
	var profile = socket.client.request.decoded_token;
	var roomName = socket.request._query.roomName;
	var roomId = socket.request._query.roomId;

	socket.join(roomName);

	/*	Get current list of users upon new connection
	 	Notify everyone else of the new user
	 */

	app.models.Room.findOne({roomName:roomName}, function(err,room) {
		if(err) throw err;
		/*
			Prevent multiple instances of "room" opened by a single user
			from logging as new users
		*/
		if(room && room.isMute==false){
			var exists = room.members.some(function(member){
				console.log(profile.displayName+" connected again to "+roomName);
				return member._id === profile._id;
			});

			if(!exists){
				room.members.push(profile);
				console.log(profile.displayName+" connected to "+roomName);
				socket.broadcast.to(roomName).emit('userjoin',profile);
			}

			room.save(function(err){
				if(err) throw err;
				socket.emit('currentusers',{
					roomMembers:room.members
				});
			});

			socket.on('outmessage', function(data){
				if(data.content.length>0){
					data.content = data.content.replace(/(<([^>]+)>)/ig,"");
					io.to(roomName).emit('inmessage',{content:data.content,sender: profile,sendTime:new Date()});
					var newMessage = new app.models.Message();
						newMessage.content = data.content;
						newMessage.sender = profile._id
						newMessage.roomId = roomId;
						newMessage.sendTime = new Date();
					newMessage.save(function(err){
						if(err) throw err;
					});
				}
			});

			socket.on('disconnect',function(data){
				socket.leave(roomName);
				app.models.Room.findOne({roomName:roomName},function(err, room){
					
					if(room){
						for(var i=0;i<room.members.length;i++){
							if(room.members[i]._id==profile._id){
								var instances = 0;
								for (var sockID in io.nsps['/'].adapter.rooms[roomName]){
									if(io.sockets.connected[sockID].client.request.decoded_token._id==profile._id){
										instances+=1;
									}
								}
								if(!(instances==1)){
									socket.broadcast.to(roomName).emit('userleave',profile._id);
									room.members.splice(i,1);
								}					
								
								break;
							}
						}
						room.save(function(err){
							socket.leave(roomName);
							console.log(profile.displayName+" disconnected from "+roomName);
							if(err) throw err;
						});

					}

				});
			});
		}
	});

});