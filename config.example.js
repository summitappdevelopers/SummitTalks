module.exports=  {
        port: 1337,
        sessionSecret: 'YOUR EXPRESS SESSION SECRET',
        jwtSecret: 'YOUR JWT SECRET',
        mongo_uri_dev: 'mongodb://localhost:27017/your-database-name',
        mongo_uri_prod: 'YOUR REMOTE MONGODB INSTANCE',
        auth: {
                g_client_id: "YOUR GOOGLE OAUTH2.0 CLIENT ID",
                g_client_secret: "YOUR GOOGLE OAUTH2.0 CLIENT SECRET",
                g_callback_url: "YOUR PROD GOOGLE OAUTH2.0 CALLBACK URL"
        }
}