const axios = require("axios");

// @ts-ignore
const api = axios.create();

// 10 secs. to timeout a request
api.defaults.timeout = 10_000;

module.exports = api;
