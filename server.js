const express = require('express');
const {Datastore} = require('@google-cloud/datastore');
const {DatastoreStore} = require('@google-cloud/connect-datastore');
const session = require('express-session');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const router = express.Router();
const { handleCallback, verifyJWT } = require('./auth.js');
const { serveInfo } = require('./handlers/user-info.js');
const config = require('./config.js');
const { RecipeHandlers } = require('./handlers/recipes.js');
const recipeHandlers = new RecipeHandlers();

const app = express();

app.use(express.static(__dirname + '/static'));
app.use(bodyParser.json());
app.set('port', 8080);
app.use(session({
    store: new DatastoreStore({
        kind: 'express-sessions',
        expirationMs: 0,
        dataset: new Datastore({
            projectId: config.PROJECT_ID,
        })
    }),
    secret: crypto.randomBytes(16).toString('base64').slice(0, 16),
    resave: true,
    saveUninitialized: false
}))

// homepage
router.get('/', function(req, res) {
    res.status(200).sendFile(__dirname + "/static/html/index.html");
});

// privacy statement
router.get('/privacy', function(req, res) {
    res.status(200).sendFile(__dirname + "/static/html/privacy.html");
});

// postman files
router.get('/pm-env', function(req, res) {
    res.status(200).sendFile(__dirname + "/static/postman/secure-boat.postman_environment.json");
});
router.get('/pm-collection', function(req, res) {
    res.status(200).sendFile(__dirname + "/static/postman/secure-boat.postman_collection.json");
});

// oauth callback
router.get('/oauth2callback', handleCallback);

// user info
router.get('/user-info', serveInfo);

// api routes


//Start up the server
app.use(router);
app.listen(app.get('port'), function() {
    console.log('Web server has begun running on port ' + app.get('port') + '; press Ctrl+C to terminate.');
});