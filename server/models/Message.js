var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var MessageSchema = new Schema({
	sender: {
		type: Schema.ObjectId,
		ref: 'User'
	},
	roomId: String,
	sendTime: Date,
	content: String
});

module.exports = mongoose.model('Message', MessageSchema);