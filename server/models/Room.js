var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/*	displayName is can have spaces and special characters
	roomName is used in URLs
*/

var RoomSchema = new Schema({
	displayName: String,
	roomName: String,
	creator: {
		type: Schema.ObjectId,
		ref: 'User'
	},
	isMute: Boolean,
	members: Array,
	creationDate: Date
});

module.exports = mongoose.model('Room', RoomSchema);