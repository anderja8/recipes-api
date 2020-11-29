const express = require('express');
const {Datastore} = require('@google-cloud/datastore');
const {DatastoreStore} = require('@google-cloud/connect-datastore');
const session = require('express-session');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const router = express.Router();
const { handleCallback, verifyJWT } = require('./middleware/auth.js');
const { UserHandlers } = require('./handlers/users.js');
const userHandlers = new UserHandlers();
const config = require('./config.js');
const { RecipeHandlers } = require('./handlers/recipes.js');
const recipeHandlers = new RecipeHandlers();
const { IngredientHandlers } = require('./handlers/ingredients.js');
const ingredientHandlers = new IngredientHandlers();
const { verifyJSONAccepts } = require('./middleware/accept.js');

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

// postman and documentation files
// TODO add these files
/*
router.get('/pm-env', function(req, res) {
    res.status(200).sendFile(__dirname + "/static/postman/secure-boat.postman_environment.json");
});
router.get('/pm-collection', function(req, res) {
    res.status(200).sendFile(__dirname + "/static/postman/secure-boat.postman_collection.json");
});
router.get('/documentation', function(req, res) {
    res.status(200).sendFile(__dirname + "/static/recipes_api_documentation.pdf");
});
*/

// oauth callback
router.get('/oauth2callback', handleCallback);

// jwt generation
router.get('/user-info', userHandlers.getJWT);

// api routes

//users
router.get('/users', verifyJSONAccepts, userHandlers.getUsers);
router.delete('/users/:user_id', verifyJSONAccepts, verifyJWT, userHandlers.deleteUsers);
//recipes
router.post('/recipes', verifyJSONAccepts, verifyJWT, recipeHandlers.postRecipe);
router.get('/recipes/:recipe_id', verifyJSONAccepts, verifyJWT, recipeHandlers.getRecipe);
router.get('/recipes', verifyJSONAccepts, verifyJWT, recipeHandlers.getRecipes);
router.put('/recipes/:recipe_id', verifyJSONAccepts, verifyJWT, recipeHandlers.putRecipe);
router.patch('/recipes/:recipe_id', verifyJSONAccepts, verifyJWT, recipeHandlers.patchRecipe);
router.delete('/recipes/:recipe_id', verifyJSONAccepts, verifyJWT, recipeHandlers.deleteRecipe);

//ingredients
router.post('/ingredients', verifyJSONAccepts, verifyJWT, ingredientHandlers.postIngredient);
router.get('/ingredients/:ingredient_id', verifyJSONAccepts, verifyJWT, ingredientHandlers.getIngredient);
router.get('/ingredients', verifyJSONAccepts, verifyJWT, ingredientHandlers.getIngredients);
router.put('/ingredients/:ingredient_id', verifyJSONAccepts, verifyJWT, ingredientHandlers.putIngredient);
router.patch('/ingredients/:ingredient_id', verifyJSONAccepts, verifyJWT, ingredientHandlers.patchIngredient);
router.delete('/ingredients/:ingredient_id', verifyJSONAccepts, verifyJWT, ingredientHandlers.deleteIngredient);

//recipe-ingredient relations
router.post('/recipes/:recipe_id/ingredients/:ingredient_id', verifyJSONAccepts, verifyJWT, recipeHandlers.addIngredient);
router.delete('/recipes/:recipe_id/ingredients/:ingredient_id', verifyJSONAccepts, verifyJWT, recipeHandlers.removeIngredient);

//Start up the server
app.use(router);
app.listen(app.get('port'), function() {
    console.log('Web server has begun running on port ' + app.get('port') + '; press Ctrl+C to terminate.');
});