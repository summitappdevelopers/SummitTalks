var room = app.modules.express.Router();
var deepPopulate = app.utilities.mongooseDeepPopulate;

room.route('/').get(app.utilities.ensureAuthenticated, function(req,res){
	app.models.Room.find({}).populate('creator').sort({creationDate: 'desc'}).exec(function(err, rooms){
    	if(err){
    		throw err;
    	}else{
    		res.json(rooms);
    	}
	});
});

room.route('/:name').get(app.utilities.ensureAuthenticated, function(req,res){
	app.models.Room.findOne({roomName:req.params.name}).populate('creator').populate('replies').exec(function(err, room) {
		if(err) throw err;
		res.json(room);
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
				newRoom.subject = req.body.subject;
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
							res.json(newRoom);
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
		if(room){
			if(room.creator.toString()==req.user._id){
				if(err){
					throw err;
				}else{
					room.isMute = !room.isMute;
					room.save(function(err){
						if(err){
							throw err;
						}else{
							res.json({isMute:room.isMute});
						}
					});
				}
			}
		}
	});
});

room.route('/:id/messages').get(app.utilities.ensureAuthenticated, function(req,res){
	
	var query = {
		roomId: req.params.id
	};

	if(req.query.before != 0){
		query._id = {$lt: req.query.before};
	}

	app.models.Message.find(query).populate('sender').populate('replies').deepPopulate('replies.sender').sort({sendTime: -1}).limit(req.query.limit).exec(function(err,messages){
		if(err){
			throw err;
		}else{
			//FIND A BETTER WAY TO DO THIS
			res.json(messages.reverse());
		}
	});

});

room.route('/:id/messages/delete/:mid').get(app.utilities.ensureAuthenticated, function(req,res){
	if(req.user.isTeacher){
		app.models.Message.remove({parentId: req.params.mid}, function(err){
			if(err) throw err;
		});
		app.models.Message.remove({_id:req.params.id}, function(err){
			if(err) throw err;
		});
	}else{
		res.json({
			message: 'Only teachers can delete messages',
			data: null
		});
	}
});

room.route('/delete').post(app.utilities.ensureAuthenticated, function(req,res){
	app.models.Room.findOne({_id:req.body.id}, function(err,room){
		if(room){
			var displayName = room.displayName;
			var roomName = room.roomName;
			if(room.creator.toString()==req.user._id){

				app.models.Message.remove({roomId: room._id}, function(err){
					if(err) throw err;
				});

				room.remove(function(err){
					if(err){
						throw err;
					}else{
						
						for(var clientId in app.modules.io.sockets.adapter.rooms[roomName]){
							var clientSocket = app.modules.io.sockets.connected[clientId];
							clientSocket.leave(roomName);
						}

						res.json('Deleted '+displayName);
					}
				});

			}else{
				res.json('You are unauthorized to delete '+displayName);
			}
		}
	});
});

module.exports = room;
