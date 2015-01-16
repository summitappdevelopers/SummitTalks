/*	
	TODO: Find a better way to load old messages
		  Disconnect sockets on room delete
*/

var room = app.modules.express.Router();

room.route('/').get(app.utilities.ensureAuthenticated, function(req,res){
	app.models.Room.find({}).populate('creator').sort({creationDate: 'desc'}).exec(function(err, rooms){
    	if(err){
    		throw err;
    	}else{
    		console.log(rooms);
    		res.json({
    			data: rooms
    		});
    	}
	});
});

room.route('/create').post(app.utilities.ensureAuthenticated,function(req, res) {
	if(req.user.isTeacher){

		var roomName = req.body.displayName.toLowerCase();
			roomName = roomName.replace(/[^A-Z0-9]+/ig, "");

		app.models.Room.find({displayName:req.body.displayName},function(err,rooms){
			if(rooms.length>0){
				roomName = roomName + rooms.length.toString();
			}
			var newRoom = new app.models.Room();
				newRoom.roomName = roomName;
				newRoom.displayName = req.body.displayName;
				newRoom.creator = req.user._id;
				newRoom.creationDate = new Date();
				newRoom.isMute = false;

			newRoom.save(function(err){
				if(err){
					throw err;
				}else{
					app.models.Room.populate(newRoom, {path: 'creator'}, function(err, room){
						if(err){
							throw err;
						}else{
							res.json({
								data: newRoom
							});
						}
					});
				}

			});

		});

	}else{
		res.json({
			message: 'Only teachers can create rooms',
			data: null
		});
	}
});

room.route('/mute').post(app.utilities.ensureAuthenticated, function(req,res){
	app.models.Room.findOne({_id:req.body.id}, function(err, room){
		if(room.creator.toString()==req.user._id){
			if(err){
				throw err;
			}else{
				room.isMute = !room.isMute;
				room.save(function(err){
					if(err){
						throw err;
					}else{
						res.json({
							data: room.isMute
						});
					}
				});
			}
		}
	});
});

room.route('/:id/messages').get(app.utilities.ensureAuthenticated, function(req,res){

	app.models.Message.find({roomId:req.params.id}).populate('sender').sort({sendTime:'asc'}).exec(function(err,messages){
		if(err){
			throw err;
		}else{
			res.json({
				messages: messages
			});
		}
	});

});

room.route('/delete').post(app.utilities.ensureAuthenticated, function(req,res){
	app.models.Room.findOne({_id:req.body.id}, function(err,room){
		var displayName = room.displayName;
		var roomName = room.roomName;
		if(room.creator.toString()==req.user._id){

			app.models.Message.remove({roomId: room._id}, function(err){
				if(err){
					throw err;
				}
			});

			room.remove(function(err){
				if(err){
					throw err;
				}else{
					
					for(var clientId in app.modules.io.sockets.adapter.rooms[roomName]){
						var clientSocket = app.modules.io.sockets.connected[clientId];
						clientSocket.disconnect();
					}

					res.json({
						message: 'Deleted '+displayName
					});
				}
			});

		}else{
			res.json({
				message: 'You are unauthorized to delete '+displayName
			});
		}
	});
});

module.exports = room;
