const fs = require('fs')

let configBytes = fs.readFileSync('config.json');
let config = JSON.parse(configBytes);

module.exports = config;