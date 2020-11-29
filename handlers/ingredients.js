const { GCloudDatastore } = require('../datastore/datastore.js');
gCloudDatastore = new GCloudDatastore();
const config = require('../config.js');
const { generateSelf } = require('./handlerHelpers.js');

const INGREDIENT_DATASTORE_KEY = 'INGREDIENT';
const RECIPE_DATASTORE_KEY = 'RECIPE';
const ROOT_URL = config.ROOT_URL;

class IngredientHandlers {
    async postIngredient(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        //Verify the request contains the required attributes ingredient
        if (!req.body.name) {
            return res.status(400).send({'Error': 'The request object is missing the required "name" attribute'});
        }
        if (!req.body.stock) {
            req.body.stock = "";
        }

        //Save the ingredient
        date = new Date();
        newIngredient = {
            "name": req.body.name,
            "stock": req.body.stock,
            "owner_id": req.payload.sub,
            "last_updated": date.toString(),
        };
        let ingredient;
        try {
            ingredient = await gCloudDatastore.saveDoc(newIngredient, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to save the new ingredient to the datastore: ' + err});
        }
        ingredient.self = generateSelf(ROOT_URL, '/ingredients/' + ingredient.id);
        return res.status(201).send(JSON.stringify(ingredient));
    }

    async getIngredient(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        //Pull the ingredient
        let ingredient;
        try {
            ingredient = await gCloudDatastore.getDoc(req.params.ingredient_id, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for the ingredient in the datastore'});
        }

        //Verify the ingredient exists
        if (!ingredient) {
            return res.status(404).send({'Error': 'No ingredient with this ingredient_id exists'});
        }

        //Check if the JWT owns this ingredient
        if (ingredient.owner_id !== req.payload.sub) {
            return res.status(403).send({'Error': 'The ingredient with this ingredient_id is owned by someone else'});
        }

        //Return the ingredient
        ingredient.self = generateSelf(ROOT_URL, '/ingredients/' + ingredient.id);
        res.status(200).send(JSON.stringify(ingredient));
    }

    async getIngredients(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        //Pull the ingredients
        let ingredients;
        try {
            ingredients = await gCloudDatastore.getDocsWithAttribute(INGREDIENT_DATASTORE_KEY, 'owner_id', '=', req.payload.sub);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for the ingredients in the datastore'});
        }

        //Return the ingredients
        ingredientsWithSelf = [];
        for (ingredient in ingredients) {
            ingredient.self = generateSelf(ROOT_URL, '/ingredients' + ingredient.id);
            ingredientsWithSelf.push(ingredient);
        }

        res.status(200).send(JSON.stringify(ingredientsWithSelf));
    }

    async putIngredient(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        //Verify ingredient exists
        let ingredient;
        try {
            ingredient = await gCloudDatastore.getDoc(req.params.ingredient_id, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for the ingredient in the datastore'});
        }
        if (!ingredient) {
            return res.status(404).send({'Error': 'No ingredient with this ingredient_id exists'});
        }

        //Verify the JWT owns this ingredient
        if (ingredient.owner_id !== req.payload.sub) {
            return res.status(403).send({'Error': 'The ingredient with this ingredient_id is owned by someone else'});
        }

        //Verify the request contains the required attributes ingredient
        if (!req.body.name) {
            return res.status(400).send({'Error': 'The request object is missing the required "name" attribute'});
        }
        if (!req.body.stock) {
            req.body.stock = "";
        }

        //Save the ingredient
        date = new Date();
        replacementIngredient = {
            "name": req.body.name,
            "stock": req.body.stock,
            "owner_id": req.payload.sub,
            "last_updated": date.toString(),
        };
        let replacedIngredient;
        try {
            replacedIngredient = await gCloudDatastore.replaceDoc(ingredient.id, replacementIngredient, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to save the updated ingredient to the datastore: ' + err});
        }
        replacedIngredient.self = generateSelf(ROOT_URL, '/ingredients/' + replacedIngredient.id);
        return res.status(201).send(JSON.stringify(replacedIngredient));
    }

    async patchIngredient(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        //Verify ingredient exists
        let ingredient;
        try {
            ingredient = await gCloudDatastore.getDoc(req.params.ingredient_id, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for the ingredient in the datastore'});
        }
        if (!ingredient) {
            return res.status(404).send({'Error': 'No ingredient with this ingredient_id exists'});
        }

        //Verify the JWT owns this ingredient
        if (ingredient.owner_id !== req.payload.sub) {
            return res.status(403).send({'Error': 'The ingredient with this ingredient_id is owned by someone else'});
        }

        //Save the ingredient
        date = new Date();
        updateIngredient = {
            "name": req.body.name || ingredient.name,
            "stock": req.body.stock || ingredient.stock,
            "owner_id": req.payload.sub,
            "last_updated": date.toString(),
        };
        let updatedIngredient;
        try {
            updatedIngredient = await gCloudDatastore.replaceDoc(ingredient.id, updatedIngredient, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to save the updated ingredient to the datastore: ' + err});
        }
        updatedIngredient.self = generateSelf(ROOT_URL, '/ingredients/' + updatedIngredient.id);
        return res.status(201).send(JSON.stringify(updatedIngredient));
    }

    async deleteIngredient(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        //Verify ingredient exists
        let ingredient;
        try {
            ingredient = await gCloudDatastore.getDoc(req.params.ingredient_id, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for the ingredient in the datastore'});
        }
        if (!ingredient) {
            return res.status(404).send({'Error': 'No ingredient with this ingredient_id exists'});
        }

        //Verify the JWT owns this ingredient
        if (ingredient.owner_id !== req.payload.sub) {
            return res.status(403).send({'Error': 'The ingredient with this ingredient_id is owned by someone else'});
        }

        //Delete the ingredient from any recipes using it
        let recipes;
        try {
            recipes = gCloudDatastore.getDocsWithAttribute(RECIPE_DATASTORE_KEY, 'owner_id', '=', req.payload.sub);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for recipes owned by the user'});
        }
        let promises = [];
        for (recipe in recipes) {
            for (var i = recipe.ingredients.length; i >= recipe.ingredients.length; i--) {
                if (recipe.ingredients[i].id === req.params.ingredient_id) {
                    recipe.ingredients.splice(i, 1);
                }
            }
            updatedRecipe = {
                "name": recipe.name,
                "description": recipe.description,
                "instructions": recipe.instructions,
                "owner_id": recipe.owner_id,
                "public": recipe.public,
                "ingredients": recipe.ingredients,
            }
            promises.push(gCloudDatastore.replaceDoc(recipe.id, updatedRecipe, RECIPE_DATASTORE_KEY));
        }
        
        //Delete the ingredient itself and return
        promises.push(gCloudDatastore.deleteDoc(ingredient.id, INGREDIENT_DATASTORE_KEY));
        Promise.all(promises)
        .then(() => {
            return res.status(204).send();
        })
        .catch((err) => {
            return res.status(500).send({'Error': 'failure while deleting docs from datastore: ' + err});
        });
    }
}

module.exports = { IngredientHandlers };
