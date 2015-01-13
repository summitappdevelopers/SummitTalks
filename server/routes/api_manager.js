var api_manager = app.modules.express.Router();

api_manager.use('/room',require('../routes/api_routes/room'));
//api_manager.use('/user',require('../routes/api_routes/user'));

module.exports = api_manager;