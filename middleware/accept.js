function verifyJSONAccepts(req, res, next) {
    // Verify the request body format is valid
    if (!req.accepts('application/json')) {
        return res.status(406).send({'Error': 'Server only sends application/json data'});
    }
    res.type('json');
    return next();
}

module.exports = { verifyJSONAccepts };
