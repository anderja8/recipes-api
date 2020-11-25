const { checkAuth, getTokenPayload } = require('../auth.js');
const axios = require('axios');


async function serveInfo(req, res) {
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
    
    const htmlStr = buildUserInfoHTML(sess.jwt, payload);

    // I'll destroy the session here for this app since the point of the auth is just to generate JWTs
    req.session.destroy();

    return res.status(200).send(htmlStr);
}


function buildUserInfoHTML(jwt, jwtPayload) {
    let htmlStr = '<!DOCTYPE html>\n<html>\n'
    htmlStr += '<head>\n<meta charset="UTF-8">\n<title>Secure Boat API</title>\n<link rel="stylesheet" href="/css/style.css">\n</head>\n'
    htmlStr += '<body>\n';
    if (jwtPayload.name) {
        htmlStr += '<h3>' + jwtPayload.name + ' JWT</h3>';
    } else {
        htmlStr += '<h3>Your JWT</h3>';
    }
    htmlStr += '<p>' + jwt + '</p>\n';
    htmlStr += '</ul>\n';
    htmlStr += '<p>As explained in the homepage site description, this page is simply displaying the user\'s JWT back to them for future';
    htmlStr += ' use with this API. Click <a href="/">here</a> to return to the homepage</p>\n';
    htmlStr += '</body>\n</html>'
    return htmlStr;
}

module.exports = { serveInfo }