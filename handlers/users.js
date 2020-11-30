const { checkAuth, getTokenPayload } = require('../middleware/auth.js');
const {GCloudDatastore} = require('../datastore/datastore.js');
gCloudDatastore = new GCloudDatastore();

const USER_DATASTORE_KEY = 'USER';
const RECIPE_DATASTORE_KEY = 'RECIPE';
const INGREDIENT_DATASTORE_KEY = 'INGREDIENT';

class UserHandlers {
    async getJWT(req, res) {
        const isAuthenticated = checkAuth(req, res);

        if (!isAuthenticated) {
            return;
        }

        var sess = req.session;
        let payload
        try {
            payload = await getTokenPayload(sess.jwt);
        } catch (err) {
            return res.status(500).send({'Error':'error getting ticket payload with google auth library'})
        }
        
        const htmlStr = _buildUserInfoHTML(sess.jwt, payload);
        req.session.destroy();

        return res.status(200).send(htmlStr);
    }

    async getUsers(req, res) {
        let users;
        try {
            users = await gCloudDatastore.getDocs(USER_DATASTORE_KEY);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for users in the datastore: ' + err});
        }

        //special handling for this array because we are using the sub as the id
        let cleanedUsers = [];
        for (let user of users) {
            let cleanedUser = {
                "id": user.sub,
                "given_name": user.given_name,
                "family_name": user.family_name,
            };
            cleanedUsers.push(cleanedUser);
        }
        return res.status(200).send(JSON.stringify(cleanedUsers));
    }

    async deleteUsers(req, res) {
        // Verify the token checked out OK from the middleware
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        // Verify the user exists and is matches the JWT
        let users;
        try {
            users = await gCloudDatastore.getDocsWithAttribute(USER_DATASTORE_KEY, 'sub', '=', req.params.user_id);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for user in the datastore: ' + err});
        }
        if (!users || users.length === 0) {
            return res.status(404).send({'Error': 'No user with this user_id exists'});
        }
        const user = users[0];
        if (user.sub !== req.payload.sub) {
            return res.status(403).send({'Error': 'The user with this user_id does not match the JWT'});
        }

        // If we got this far, the request is valid, delete the user, their recipes, and their ingredients
        let promises = [];
        let recipes = [];
        let ingredients = [];
        try {
            recipes = await gCloudDatastore.getDocsWithAttribute(RECIPE_DATASTORE_KEY, 'owner_id', '=', user.sub);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for recipes in the datastore: ' + err});
        }
        try {
            ingredients = await gCloudDatastore.getDocsWithAttribute(INGREDIENT_DATASTORE_KEY, 'owner_id', '=', user.sub);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for ingredients in the datastore: ' + err});
        }
        for (let recipe of recipes) {
            promises.push(gCloudDatastore.deleteDoc(recipe.id, RECIPE_DATASTORE_KEY));
        }
        for (let ingredient of ingredients) {
            promises.push(gCloudDatastore.deleteDoc(ingredient.id, INGREDIENT_DATASTORE_KEY));
        }
        promises.push(gCloudDatastore.deleteDoc(user.id, USER_DATASTORE_KEY));
        await Promise.all(promises)
            .catch((err) => {
                return res.status(500).send({'Error': 'failure while deleting docs from datastore: ' + err});
            });
        return res.status(204).send();
    }

    async addUserIfNotExists(req, res, next) {
        //Verify JWT was OK
        if (req.error) {
            return res.status(401).send({'Error': req.error});
        }

        let docs;
        try {
            docs = await gCloudDatastore.getDocsWithAttribute(USER_DATASTORE_KEY, 'sub', '=', req.payload.sub);
        } catch (err) {
            return res.status(500).send({'Error': 'failed to search for user in the datastore ' + err});
        }

        if (docs.length === 0) {
            let newUser = {
                "given_name": req.payload.given_name || "",
                "family_name": req.payload.family_name || "",
                "sub": req.payload.sub,
            }
            try {
                await gCloudDatastore.saveDoc(newUser, USER_DATASTORE_KEY);
            } catch (err) {
                return res.status(500).send({'Error': 'failed to save new user to datastore ' + err})
            }
        }
        return next();
    }
}

function _buildUserInfoHTML(jwt, jwtPayload) {
    let htmlStr = '<!DOCTYPE html>\n<html>\n'
    htmlStr += '<head>\n<meta charset="UTF-8">\n<title>Secure Boat API</title>\n<link rel="stylesheet" href="/css/style.css">\n</head>\n'
    htmlStr += '<body>\n';
    if (jwtPayload.name) {
        htmlStr += '<h3>' + jwtPayload.name + ' User Info</h3>';
    } else {
        htmlStr += '<h3>User Info</h3>';
    }
    htmlStr += '<h4>ID</h4>';
    htmlStr += '<p>' + jwtPayload.sub + '</p>';
    htmlStr += '<h4>JWT</h4>';
    htmlStr += '<p>' + jwt + '</p>';
    htmlStr += '</ul>';
    htmlStr += '<p>As explained in the homepage site description, this page is simply displaying the user\'s JWT back to them for future';
    htmlStr += ' use with this API. Click <a href="/">here</a> to return to the homepage</p>\n';
    htmlStr += '</body>\n</html>'
    return htmlStr;
}

module.exports = { UserHandlers }