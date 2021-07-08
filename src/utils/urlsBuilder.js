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

module.exports = urlsBuilder;
