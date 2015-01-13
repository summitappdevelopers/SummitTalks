var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var UserSchema = new Schema({
	displayName: String,
	picture: String,
	email: String,
	isTeacher: Boolean,
	google_id: String
});

module.exports = mongoose.model('User', UserSchema);