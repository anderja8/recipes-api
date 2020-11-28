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


    async postBoat(req, res) {
        res.type('json');

        // Verify the token checked out OK from the middleware
        if (req.err) {
            return res.status(401).send({'Error': req.err});
        }

        // Verify the request body format is valid
        if(req.get('content-type') !== 'application/json'){
            return res.status(415).send({'Error': 'Server only accepts application/json data'});
        }

        // Verify that the required attributes are present
        if (!req.body.name || !req.body.type || !req.body.length || req.body.public === null) {
            return res.status(400).send({'Error': 'The request object is missing at least one of the required attributes'});
        }

        let newBoat = {
            "name": req.body.name,
            "type": req.body.type,
            "length": req.body.length,
            "public": req.body.public,
            "owner": req.payload.sub,
        };

        let savedBoat;
        try {
            savedBoat = await gCloudDatastore.saveDoc(newBoat, BOAT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to save the new boat to the datastore: ' + err});
        }
        return res.status(201).send(JSON.stringify(savedBoat));
    }

    async getBoatByOwner(req, res) {
        res.type('json');

        let boats;
        try {
            boats = await gCloudDatastore.getDocsWithAttribute(BOAT_DATASTORE_KEY, 'owner', '=', req.params.owner_id);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for boats in the datastore: ' + err});
        }

        let publicBoats = [];
        for (let boat of boats) {
            if (boat.public === true) {
                publicBoats.push(boat);
            }
        }

        return res.status(200).send(JSON.stringify(publicBoats));
    }

    async getBoats(req, res) {
        res.type('json');

        // Verify the token checked out OK from the middleware
        let validJWT = true;
        if (req.err) {
            validJWT = false;
        }

        // Decide what attribute to filter boats by
        let attribute, attributeValue;
        if (validJWT) {
            attribute = "owner";
            attributeValue = req.payload.sub;
        } else {
            attribute = "public";
            attributeValue = true;
        }

        // Pull the boats and send them
        let boats;
        try {
            boats = await gCloudDatastore.getDocsWithAttribute(BOAT_DATASTORE_KEY, 'public', '=', true);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for boats in the datastore: ' + err});
        }
        return res.status(200).send(JSON.stringify(boats));
    }

    async deleteBoat(req, res) {
        // Verify the token checked out OK from the middleware
        if (req.err) {
            return res.status(401).send({'Error': req.err});
        }

        // Verify the boat exists and is owned by the JWT sub
        let boat;
        try {
            boat = await gCloudDatastore.getDoc(req.params.boat_id, BOAT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for boat in the datastore: ' + err});
        }
        if (!boat) {
            return res.status(403).send({'Error': 'No boat with this boat_id exists'});
        }
        if (boat.owner !== req.payload.sub) {
            return res.status(403).send({'Error': 'The boat with this boat_id is owned by someone else'});
        }

        // If we got this far, the request is valid, delete the boat
        //Try to delete the boat
        try {
            await gCloudDatastore.deleteDoc(req.params.boat_id, BOAT_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to delete the boat from the datastore: ' + err});
        }
        return res.status(204).send();
    }
}

module.exports = { RecipeHandlers };
