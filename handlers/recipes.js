const { GCloudDatastore } = require('../datastore/datastore.js');
gCloudDatastore = new GCloudDatastore();
const config = require('../config.js');
const { generateSelf } = require('./handlerHelpers.js');

const RECIPE_DATASTORE_KEY = 'RECIPE';
const INGREDIENT_DATASTORE_KEY = 'INGREDIENT';
const ROOT_URL = config.ROOT_URL;
const PAGINATION_SIZE = 5;

class RecipeHandlers {
    async postRecipe(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({ 'Error': req.error });
        }

        //Verify the request contains the required attributes recipe
        if (!req.body.name || !req.body.description || req.body.public === null) {
            return res.status(400).send({ 'Error': 'The request object is missing at least one of the required attributes' });
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
            return res.status(500).send({ 'Error': 'failed to save the new recipe to the datastore: ' + err });
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
            return res.status(500).send({ 'Error': 'failed to search for the recipe in the datastore' });
        }

        //Verify the recipe exists
        if (!recipe) {
            return res.status(404).send({ 'Error': 'No recipe with this recipe_id exists' });
        }

        //If the recipe is not public, verify the user is the owner
        if (!recipe.public) {
            //Verify JWT was OK
            if (req.error) {
                return res.status(401).send({ 'Error': req.error });
            }
            if (recipe.owner_id !== req.payload.sub) {
                return res.status(403).send({ 'Error': 'The recipe with this recipe_id is owned by someone else' });
            }
        }

        //Get the ingredient names
        let promises = [];
        for (var i = 0; i < recipe.ingredients.length; i++) {
            promises.push(gCloudDatastore.getDoc(recipe.ingredients[i].id, INGREDIENT_DATASTORE_KEY));
        }
        Promise.all(promises)
            .then((ingredientsFromDatastore) => {
                for (i = 0; i < recipe.ingredients.length; i++) {
                    recipe.ingredients[i].name = ingredientsFromDatastore[i].name;
                }
            })
            .catch((err) => {
                return res.status(500).send({ 'Error': 'failure while getting ingredient names from datastore: ' + err });
            });

        //Return the recipe
        recipe.self = generateSelf(ROOT_URL, '/recipes/' + recipe.id);
        return res.status(200).send(JSON.stringify(recipe));
    }

    async getRecipes(req, res) {
        validJWT = true;
        if (req.error) {
            validJWT = false;
        }

        //Get all recipes owned by the user, or all public recipes if JWT is missing/invalid
        let data;
        if (validJWT) {
            try {
                data = await gCloudDatastore.getDocsWithAttributeAndPagination(
                    RECIPE_DATASTORE_KEY, 'owner_id', '=', req.payload.sub, PAGINATION_SIZE, req.query.endCursor);
            } catch (err) {
                return res.status(500).send({ 'Error': 'failed to search for recipes in the datastore' });
            }
        } else {
            try {
                data = await gCloudDatastore.getDocsWithAttributeAndPagination(
                    RECIPE_DATASTORE_KEY, 'public', '=', true, PAGINATION_SIZE, req.query.endCursor);
            } catch (err) {
                return res.status(500).send({ 'Error': 'failed to search for recipes in the datastore' });
            }
        }
        let recipes = data[0]
        const dataInfo = data[1];

        //Get the ingredient names and self for the recipes
        for (var i = 0; i < recipes.length; i++) {
            let promises = [];
            for (j = 0; i < recipes[i].ingredients.length; j++) {
                promises.push(gCloudDatastore.getDoc(recipes[i].ingredients[j].id, INGREDIENT_DATASTORE_KEY));
            }
            Promise.all(promises)
                .then((ingredientsFromDatastore) => {
                    for (j = 0; j < recipe.ingredients.length; j++) {
                        recipes[i].ingredients[j].name = ingredientsFromDatastore[j].name;
                    }
                })
                .catch((err) => {
                    return res.status(500).send({ 'Error': 'failure while getting ingredient names from datastore: ' + err });
                });
            recipes[i].self = generateSelf(ROOT_URL, '/recipes/' + recipes[i].id);
        }

        //Create the json body to return
        let retJSON = {
            "recipes": recipes
        };
        if (pageInfo.moreResults === true) {
            retJSON.next = ROOT_URL + '/recipes?endCursor=' + pageInfo.endCursor;
        }

        return res.status(200).send(JSON.stringify(retJSON));
    }

    async putRecipe(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({ 'Error': req.error });
        }

        //Verify recipe exists
        let recipe;
        try {
            recipe = await gCloudDatastore.getDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'failed to search for the recipe in the datastore' });
        }
        if (!recipe) {
            return res.status(404).send({ 'Error': 'No recipe with this recipe_id exists' });
        }

        //Verify the JWT owns this recipe
        if (recipe.owner_id !== req.payload.sub) {
            return res.status(403).send({ 'Error': 'The recipe with this recipe_id is owned by someone else' });
        }

        //Verify the request contains the required attributes recipe
        if (!req.body.name || !req.body.description || req.body.public === null) {
            return res.status(400).send({ 'Error': 'The request object is missing at least one of the required attributes' });
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
            "ingredients": recipe.ingredients,
        };
        let replacedRecipe;
        try {
            replacedRecipe = await gCloudDatastore.replaceDoc(recipe.id, replacementRecipe, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'failed to save the updated recipe to the datastore: ' + err });
        }
        replacedRecipe.self = generateSelf(ROOT_URL, '/recipes/' + replacedRecipe.id);
        return res.status(201).send(JSON.stringify(replacedRecipe));
    }

    async patchRecipe(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({ 'Error': req.error });
        }

        //Verify recipe exists
        let recipe;
        try {
            recipe = await gCloudDatastore.getDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'failed to search for the recipe in the datastore' });
        }
        if (!recipe) {
            return res.status(404).send({ 'Error': 'No recipe with this recipe_id exists' });
        }

        //Verify the JWT owns this recipe
        if (recipe.owner_id !== req.payload.sub) {
            return res.status(403).send({ 'Error': 'The recipe with this recipe_id is owned by someone else' });
        }

        //Save the recipe
        let isPublic = false;
        if (req.body.public === null) {
            isPublic = req.body.public;
        }
        updatedRecipe = {
            "name": req.body.name || recipe.name,
            "description": req.body.description || recipe.description,
            "instructions": req.body.instructions || recipe.instructions,
            "owner_id": req.payload.sub,
            "public": isPublic,
            "ingredients": recipe.ingredients,
        };
        let updateRecipe;
        try {
            updateRecipe = await gCloudDatastore.replaceDoc(recipe.id, updatedRecipe, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'failed to save the updated recipe to the datastore: ' + err });
        }
        updateRecipe.self = generateSelf(ROOT_URL, '/recipes/' + updateRecipe.id);
        return res.status(201).send(JSON.stringify(updateRecipe));
    }

    async deleteRecipe(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({ 'Error': req.error });
        }

        //Verify recipe exists
        let recipe;
        try {
            recipe = await gCloudDatastore.getDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'failed to search for the recipe in the datastore' });
        }
        if (!recipe) {
            return res.status(404).send({ 'Error': 'No recipe with this recipe_id exists' });
        }

        //Verify the JWT owns this recipe
        if (recipe.owner_id !== req.payload.sub) {
            return res.status(403).send({ 'Error': 'The recipe with this recipe_id is owned by someone else' });
        }

        //Delete the recipe from any ingredients using it
        let ingredients;
        try {
            ingredients = gCloudDatastore.getDocsWithAttribute(RECIPE_DATASTORE_KEY, 'owner_id', '=', req.payload.sub);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for ingredients owned by the user'});
        }
        let promises = [];
        for (ingredient in ingredients) {
            for (var i = ingredient.recipes.length; i >= 0; i--) {
                if (ingredient.recipes[i].id === req.params.recipe_id) {
                    ingredient.recipes.splice(i, 1);
                }
            }
            updatedIngredient = {
                "name": ingredient.name,
                "stock": ingredient.stock,
                "owner_id": ingredient.owner_id,
                "last_updated": ingredient.last_updated,
                "recipes": ingredient.recipes,
            }
            promises.push(gCloudDatastore.replaceDoc(ingredient.id, updatedIngredient, INGREDIENT_DATASTORE_KEY));
        }

        //Delete the recipe
        let result;
        try {
            result = await gCloudDatastore.deleteDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'could not delete recipe from datastore ' + err });
        }
        return res.status(204).send();
    }

    async addIngredient(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({ 'Error': req.error });
        }

        //Verify recipe and ingredient exist and are owned by the JWT
        let recipe;
        try {
            recipe = await gCloudDatastore.getDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'Could not search datastore for recipe ' + err });
        }
        if (!recipe) {
            return res.status(404).send({ 'Error': 'No recipe with this recipe_id exists' });
        }
        if (recipe.owner_id !== req.payload.sub) {
            return res.status(403).send({ 'Error': 'The recipe with this recipe_id is owned by someone else' });
        }

        let ingredient;
        try {
            ingredient = await gCloudDatastore.getDoc(req.params.ingredient_id, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'Could not search datastore for ingredient ' + err });
        }
        if (!ingredient) {
            return res.status(404).send({ 'Error': 'No ingredient with this ingredient_id exists' });
        }
        if (ingredient.owner_id !== req.payload.sub) {
            return res.status(403).send({ 'Error': 'The ingredient with this ingredient_id is owned by someone else' });
        }

        //Verify the ingredient is not already linked to this recipe
        for (ingredient in recipe.ingredients) {
            if (ingredient.id === req.params.ingredient_id) {
                return res.status(403).send({
                    'Error': 'The ingredient with this ingredient_id is already linked to the recipe with this recipe_id. \
                    Use PUT or PATCH to update the ingredient quantity'
                });
            }
        }

        //Verify that the required quantity is present
        if (!req.body.quantity) {
            return res.status(400).send({ 'Error': 'The request object is missing the required "quantity" attribute' });
        }

        //Add the ingredient and quantity
        recipe.ingredients.push({ "id": ingredient.id, "quantity": req.body.quantity });
        ingredient.recipes.push({"id": recipe.id});

        //Save the updated recipe and ingredient
        let updatedRecipe = {
            "name": recipe.name,
            "description": recipe.description,
            "instructions": recipe.instructions,
            "owner_id": recipe.owner_id,
            "public": recipe.public,
            "ingredients": recipe.ingredients,
        };
        try {
            await gCloudDatastore.replaceDoc(recipe.id, updatedRecipe, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'failed to save the linked recipe to the datastore: ' + err });
        }

        let updatedIngredient = {
            "name": ingredient.name,
            "stock": ingredient.stock,
            "owner_id": ingredient.owner_id,
            "last_updated": ingredient.last_updated,
            "recipes": ingredient.recipes,
        }
        try {
            await gCloudDatastore.replaceDoc(ingredient.id, updatedIngredient, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'failed to save the linked ingredient to the datastore: ' + err });
        }

        return res.status(204).send();
    }

    async modifyIngredient(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({ 'Error': req.error });
        }

        //Verify recipe and ingredient exist and are owned by the JWT
        let recipe;
        try {
            recipe = await gCloudDatastore.getDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'Could not search datastore for recipe ' + err });
        }
        if (!recipe) {
            return res.status(404).send({ 'Error': 'No recipe with this recipe_id exists' });
        }
        if (recipe.owner_id !== req.payload.sub) {
            return res.status(403).send({ 'Error': 'The recipe with this recipe_id is owned by someone else' });
        }

        let ingredient;
        try {
            ingredient = await gCloudDatastore.getDoc(req.params.ingredient_id, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'Could not search datastore for ingredient ' + err });
        }
        if (!ingredient) {
            return res.status(404).send({ 'Error': 'No ingredient with this ingredient_id exists' });
        }
        if (ingredient.owner_id !== req.payload.sub) {
            return res.status(403).send({ 'Error': 'The ingredient with this ingredient_id is owned by someone else' });
        }

        //Verify that the required quantity is present
        if (!req.body.quantity) {
            return res.status(400).send({ 'Error': 'The request object is missing the required "quantity" attribute' });
        }

        //Update the ingredient quantity
        let foundIngredient = false;
        for (var i = 0; i < recipe.ingredients.length; i++) {
            if (recipe.ingredients[i].id === req.params.ingredient_id) {
                foundIngredient = true;
                recipe.ingredients.quantity = req.body.quantity;
                break;
            }
        }

        //If the ingredient wasn't in the recipes' ingredients list, throw a 404
        if (!foundIngredient) {
            return res.status(404).send({ 'Error' : 'The ingredient with this ingredient_id was not linked to the recipe with this recipe_id' })
        }

        //Save the updated recipe
        let updatedRecipe = {
            "name": recipe.name,
            "description": recipe.description,
            "instructions": recipe.instructions,
            "owner_id": recipe.owner_id,
            "public": recipe.public,
            "ingredients": recipe.ingredients,
        };
        try {
            await gCloudDatastore.replaceDoc(recipe.id, updatedRecipe, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'failed to save the recipe-ingredient link to the datastore: ' + err });
        }
        return res.status(204).send();
    }

    async removeIngredient(req, res) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({ 'Error': req.error });
        }

        //Verify recipe and ingredient exist and are owned by the JWT
        let recipe;
        try {
            recipe = await gCloudDatastore.getDoc(req.params.recipe_id, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'Could not search datastore for recipe ' + err });
        }
        if (!recipe) {
            return res.status(404).send({ 'Error': 'No recipe with this recipe_id exists' });
        }
        if (recipe.owner_id !== req.payload.sub) {
            return res.status(403).send({ 'Error': 'The recipe with this recipe_id is owned by someone else' });
        }

        let ingredient;
        try {
            ingredient = await gCloudDatastore.getDoc(req.params.ingredient_id, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'Could not search datastore for ingredient ' + err });
        }
        if (!ingredient) {
            return res.status(404).send({ 'Error': 'No ingredient with this ingredient_id exists' });
        }
        if (ingredient.owner_id !== req.payload.sub) {
            return res.status(403).send({ 'Error': 'The ingredient with this ingredient_id is owned by someone else' });
        }

        //Look for the ingredient and remove it
        let foundIngredient = false;
        for (var i = 0; i < recipe.ingredients.length; i++) {
            if (recipe.ingredients[i].id === req.params.ingredient_id) {
                foundIngredient = true;
                recipe.ingredients.splice(i, 1);
                break;
            }
        }

        //Look for the recipe and remove it
        let foundRecipe = false;
        for (var i = 0; i < ingredient.recipes.length; i++) {
            if (ingredient.recipes[i].id === req.params.recipe_id) {
                foundRecipe = true;
                ingredient.recipes.splice(i, 1);
                break;
            }
        }
        
        //If the ingredient wasn't in the recipes' ingredients list, or the recipe wasn't in the ingredients' recipes list, throw a 404
        if (!foundIngredient || !foundRecipe) {
            return res.status(404).send({ 'Error' : 'The ingredient with this ingredient_id was not linked to the recipe with this recipe_id' })
        }

        //Save the update recipe
        let updatedRecipe = {
            "name": recipe.name,
            "description": recipe.description,
            "instructions": recipe.instructions,
            "owner_id": recipe.owner_id,
            "public": recipe.public,
            "ingredients": recipe.ingredients,
        };
        try {
            await gCloudDatastore.replaceDoc(recipe.id, updatedRecipe, RECIPE_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'failed to save the recipe-ingredient link to the datastore: ' + err });
        }

        //Save the updated ingredient
        let updatedIngredient = {
            "name": ingredient.name,
            "stock": ingredient.stock,
            "owner_id": ingredient.owner_id,
            "last_updated": ingredient.last_updated,
            "recipes": ingredient.recipes,
        }
        try {
            await gCloudDatastore.replaceDoc(ingredient.id, updatedIngredient, INGREDIENT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({ 'Error': 'failed to save the linked ingredient to the datastore: ' + err });
        }

        return res.status(204).send();
    }
}

module.exports = { RecipeHandlers };
