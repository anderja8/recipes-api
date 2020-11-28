const config = require('../config.js');
const url = require('url');
const axios = require('axios');
const crypto = require('crypto');

//const ROOT_URL = 'https://anderja8-secure-boat.appspot.com';
const ROOT_URL = 'http://localhost:8080';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REDIRECT_URI = ROOT_URL + '/oauth2callback';
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(config.CLIENT_ID);

async function verifyJWT(req, res, next) {
    // verify authorization header is correctly formed
    var authorization = req.headers["authorization"];
    if (!authorization) {
        req.error = 'No authorization header provided';
        return next();
    }
    var authArr = authorization.split(' ');
    if (authArr[0].trim() != "Bearer") {
        req.error = 'malformatted authorization header, should be "authorization":"Bearer <token>"';
        return next();
    } else if (authArr.length < 2) {
        req.error = 'missing JWT in authorization header';
        return next();
    }

    let payload;
    try {
        payload = await getTokenPayload(authArr[1]);
    } catch (error) {
        req.err = 'failed to validate supplied JWT';
        return next();
    }
    req.payload = payload;
    return next();
}

async function getTokenPayload(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: config.CLIENT_ID,
    });
    return ticket.getPayload();
}

function checkAuth(req, res) {
    var sess = req.session;

    if (!sess.jwt) {
        sess.redirEndpoint = req.url;
        sess.state = crypto.randomBytes(16).toString('base64').slice(0, 16)

        res.redirect(url.format({
            pathname: AUTH_ENDPOINT,
            query: {
                "client_id": config.CLIENT_ID,
                "redirect_uri": REDIRECT_URI,
                "response_type": "code",
                "scope": "https://www.googleapis.com/auth/userinfo.profile",
                "access_type": "online",
                "state": sess.state,
                "include_granted_scopes": true
            }
        }));

        return false;
    }

    return true;
}

function handleCallback(req, res) {
    if (req.query.error) {
        res.status(500).send({"error": req.query.error});
    }

    var sess = req.session;
    if (req.query.state != sess.state) {
        res.status(500).send({"Error": "invalid state received from auth provider"});
    }
    
    const code = req.query.code;

    return axios.post(TOKEN_ENDPOINT, {
        client_id: config.CLIENT_ID,
        client_secret: config.CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI
    }).then(function (tokenRes) {
        var sess = req.session;
        redir = sess.redirEndpoint;
        sess.redirEndpoint = "";
        sess.jwt = tokenRes.data.id_token;
        res.redirect(redir);
    }).catch(function (error) {
        console.log(error);
        res.status(500).send({"Error": error});
    })
}


module.exports = { handleCallback, checkAuth, verifyJWT, getTokenPayload };