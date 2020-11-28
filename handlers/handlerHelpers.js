function generateSelf(rootURL, suffix) {
    self = rootURL + suffix;
    return self;
}

module.exports = { generateSelf };