module.exports=  {
	port: 1337,
	sessionSecret: 'topszn',
	jwtSecret: 'scheminup',
	mongo_uri_dev: 'mongodb://localhost:27017/summit-talks-dev',
	mongo_uri_prod: 'mongodb://heroku_app33201011:ka4anhdnpjbcklnsdt7n188o8h@ds031741.mongolab.com:31741/heroku_app33201011',
	auth: {
		g_client_id: "764510630822-clsfk29gnm6n3bgiur9uc0l5qm7ss6ft.apps.googleusercontent.com",
		g_client_secret: "Dmh6kWGILQ1DpHM5_jGSsT3Z",
		g_callback_url: "http://localhost:1337/auth/google/callback"
	}
}
