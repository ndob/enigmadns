const path = require("path");

module.exports = {
    entry: {
        src: "./src/index.js",
    },
    output: {
        path: path.resolve(__dirname, "addon"),
        filename: "[name]/index.js"
    }
};
