var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var MessageSchema = new Schema({
	sender: {
		type: Schema.ObjectId,
		ref: 'User'
	},
	replies: [{"type":Schema.ObjectId, "ref":"Message"}],
	roomId: String,
	sendTime: Date,
	content: String,
	parentId: Schema.ObjectId
});

MessageSchema.plugin(app.utilities.mongooseDeepPopulate);

module.exports = mongoose.model('Message', MessageSchema);