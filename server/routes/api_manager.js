var api_manager = app.modules.express.Router();

api_manager.use('/room',require('../routes/api_routes/room'));
api_manager.use('/message',require('../routes/api_routes/message'));
api_manager.use('/mail',require('../routes/api_routes/mail'));

module.exports = api_manager;