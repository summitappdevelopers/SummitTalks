# Summit Talks
A teacher moderated group chat web applications for Summit Public Schools.
https://summittalks.herokuapp.com/

![Summit Talks](http://image-store.slidesharecdn.com/33abe51f-973b-4546-82fb-81ed7fc43a80-large.png)

## Features

* Realtime room based group chat
    * Supports message replies
* Teacher moderation tools
    * Create rooms
    * Mute rooms
    * Delete rooms
    * Invite students to join rooms

## Deployment

The production version of Summit Talks is hosted on [Heroku](http://herokuapp.com/). Contributors can submit pull requests to `master` which will then be pushed to production. Below are instructions to run Summit Talks locally. 

### Dependencies

* [Node.js](https://nodejs.org/)

* [MongoDB](http://docs.mongodb.org/manual/installation/)

#### Optional

* [react-tools](https://www.npmjs.com/package/react-tools)

* [Sass](http://sass-lang.com/)

### Step-by-step instructions

1. Navigate to the root of the project and run: `npm install`

2. Start MongoDB by running `mongod`

3. Run `mongo` to and type in `use summit-talks-dev`. This will create the database which the application will connect to.

4. Copy `config.example.js` to `config.js` and fill in the placeholders. You can grab your OAuth2.0 credentials after you create an app on the [Google Cloud Console](https://console.developers.google.com/project). You can ignore `mongo_uri_prod` unless you want to deploy it on a production server.

5. In order to modify the frontend code, you can navigate to `/public` and run `./compile`. This will start the watchers for compiling `.jsx` and `.scss` files. You must have the two optional dependencies installed for this to work.
