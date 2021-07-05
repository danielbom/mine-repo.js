const axios = require("axios");
const config = require("./config");

// https://stackoverflow.com/questions/43051291/attach-authorization-header-for-all-axios-requests
// TODO: Add default headers
// - "Accept: application/vnd.github.v3+json"
// - "Accept: application/vnd.github.inertia-preview+json"

// @ts-ignore
const api = axios.create({
  headers: {
    Authorization: `Bearer ${config.GITHUB_APIKEY}`,
    Accept: "application/vnd.github.v3+json",
  },
});

const urlsBuilder = ({ projectOwner, projectName }) => ({
  getRepositoryUrl() {
    return `https://api.github.com/repos/${projectOwner}/${projectName}`;
  },
  getClosedPullRequestsUrl({ page }) {
    return `https://api.github.com/repos/${projectOwner}/${projectName}/pulls?state="closed"&page=${page}`;
  },
  getLanguages() {
    return `https://api.github.com/repos/${projectOwner}/${projectName}/languages`;
  },
  getRequesterFollowsMergerUrl({ requesterLogin, mergerLogin }) {
    // Status: 204 === YES | 404 === NO
    // Para cada pull request é necessário fazer uma chamada a esta URL
    // TODO: Cachear resultados dos usuários para evitar chamadas redundantes e consumir a API de forma desnecessária
    return `https://api.github.com/users/${requesterLogin}/following/${mergerLogin}`;
  },
});

module.exports = {
  api,
  urlsBuilder,
};
