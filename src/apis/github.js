const axios = require("axios");
const config = require("../config");

// https://stackoverflow.com/questions/43051291/attach-authorization-header-for-all-axios-requests
// TODO: Add default headers
// - "Accept: application/vnd.github.v3+json"
// - "Accept: application/vnd.github.inertia-preview+json"

// @ts-ignore
const api = axios.create({
  headers: {
    Authorization: `Bearer ${config.GITHUB_APIKEY}`,
    // Accept: "application/vnd.github.v3+json",
  },
});

api.defaults.timeout = 8000;

module.exports = api;
