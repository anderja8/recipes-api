const { GCloudDatastore } = require('../datastore/datastore.js');
gCloudDatastore = new GCloudDatastore();
const { generateSelf } = require('./handlerHelpers.js');

const RECIPE_DATASTORE_KEY = 'RECIPE';
const ROOT_URL = 'http://localhost:8080';

class RecipeHandlers {
    async postRecipe(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        //Verify the request contains the required attributes recipe
        if (!req.body.name || !req.body.description || req.body.public === null) {
            return res.status(400).send({'Error': 'The request object is missing at least one of the required attributes'});
        }
        if (!req.body.instructions) {
            req.body.instructions = "";
        }

        //Save the recipe
        newRecipe = {
            "name": req.body.name,
            "description": req.body.description,
            "instructions": req.body.instructions,
            "owner_id": req.payload.sub,
            "public": req.body.public,
            "ingredients": [],
        };
        let recipe;
        try {
            recipe = await gCloudDatastore.saveDoc(newRecipe, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to save the new recipe to the datastore: ' + err});
        }
        recipe.self = generateSelf(ROOT_URL, '/recipes/' + recipe.id);
        return res.status(201).send(JSON.stringify(recipe));
    }

    async getRecipe(req, res) {
        //Pull the recipe
        let recipe;
        try {
            recipe = await gCloudDatastore.getDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for the recipe in the datastore'});
        }

        //Verify the recipe exists
        if (!recipe) {
            return res.status(404).send({'Error': 'No recipe with this recipe_id exists'});
        }

        //If the recipe is not public, verify the user is the owner
        if (!recipe.public) {
            //Verify JWT was OK
            if (req.error) {
                return res.status(401).send({'Error': req.error});
            }
            if (recipe.owner !== req.payload.sub) {
                return res.status(403).send({'Error': 'The recipe with this recipe_id is owned by someone else'});
            }
        }

        //Return the recipe
        recipe.self = generateSelf(ROOT_URL, '/recipes/' + recipe.id);
        res.status(200).send(JSON.stringify(recipe));
    }

    async getRecipes(req, res) {
        validJWT = true;
        if (req.error) {
            validJWT = false;
        }

        let recipes;
        if (validJWT) {
            try {
                recipes = await gCloudDatastore.getDocsWithAttribute(RECIPE_DATASTORE_KEY, 'owner_id', '=', req.payload.sub);
            } catch (err) {
                return res.status(500).send({'Error': 'failed to search for recipes in the datastore'});
            }
        } else {
            try {
                recipes = await gCloudDatastore.getDocsWithAttribute(RECIPE_DATASTORE_KEY, 'public', '=', true);
            } catch (err) {
                return res.status(500).send({'Error': 'failed to search for recipes in the datastore'});
            }
        }

        recipesWithSelf = [];
        for (recipe in recipes) {
            recipe.self = generateSelf(ROOT_URL, '/recipes' + recipe.id);
            recipesWithSelf.push(recipe);
        }

        res.status(200).send(JSON.stringify(recipesWithSelf));
    }

    async putRecipe(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        //Verify recipe exists
        let recipe;
        try {
            recipe = await gCloudDatastore.getDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for the recipe in the datastore'});
        }
        if (!recipe) {
            return res.status(404).send({'Error': 'No recipe with this recipe_id exists'});
        }

        //Verify the JWT owns this recipe
        if (recipe.owner_id !== req.payload.sub) {
            return res.status(403).send({'Error': 'The recipe with this recipe_id is owned by someone else'});
        }

        //Verify the request contains the required attributes recipe
        if (!req.body.name || !req.body.description || req.body.public === null) {
            return res.status(400).send({'Error': 'The request object is missing at least one of the required attributes'});
        }
        if (!req.body.instructions) {
            req.body.instructions = "";
        }

        //Save the recipe
        replacementRecipe = {
            "name": req.body.name,
            "description": req.body.description,
            "instructions": req.body.instructions,
            "owner_id": req.payload.sub,
            "public": req.body.public,
            "ingredients": [],
        };
        let replacedRecipe;
        try {
            replacedRecipe = await gCloudDatastore.replaceDoc(recipe.id, replacementRecipe, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to save the updated recipe to the datastore: ' + err});
        }
        replacedRecipe.self = generateSelf(ROOT_URL, '/recipes/' + replacedRecipe.id);
        return res.status(201).send(JSON.stringify(replacedRecipe));
    }

    async patchRecipe(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        //Verify recipe exists
        let recipe;
        try {
            recipe = await gCloudDatastore.getDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for the recipe in the datastore'});
        }
        if (!recipe) {
            return res.status(404).send({'Error': 'No recipe with this recipe_id exists'});
        }

        //Verify the JWT owns this recipe
        if (recipe.owner_id !== req.payload.sub) {
            return res.status(403).send({'Error': 'The recipe with this recipe_id is owned by someone else'});
        }

        //Save the recipe
        public = false;
        if (req.body.public === null) {
            public = req.body.public;
        }
        updatedRecipe = {
            "name": req.body.name || recipe.name,
            "description": req.body.description || recipe.description,
            "instructions": req.body.instructions || recipe.instructions,
            "owner_id": req.payload.sub,
            "public": public,
            "ingredients": req.body.ingredients,
        };
        let updateRecipe;
        try {
            updateRecipe = await gCloudDatastore.replaceDoc(recipe.id, updatedRecipe, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to save the updated recipe to the datastore: ' + err});
        }
        updateRecipe.self = generateSelf(ROOT_URL, '/recipes/' + updateRecipe.id);
        return res.status(201).send(JSON.stringify(updateRecipe));
    }

    async deleteRecipe(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        //Verify recipe exists
        let recipe;
        try {
            recipe = await gCloudDatastore.getDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for the recipe in the datastore'});
        }
        if (!recipe) {
            return res.status(404).send({'Error': 'No recipe with this recipe_id exists'});
        }

        //Verify the JWT owns this recipe
        if (recipe.owner_id !== req.payload.sub) {
            return res.status(403).send({'Error': 'The recipe with this recipe_id is owned by someone else'});
        }

        //Delete the recipe
        let result;
        try {
            result = await gCloudDatastore.deleteDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            res.status(500).send({'Error': 'could not delete recipe from datastore ' + err});
        }
        return res.status(204).send();
    }
}

module.exports = { RecipeHandlers };
