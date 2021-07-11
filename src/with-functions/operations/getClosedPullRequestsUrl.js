module.exports = ({ projectOwner, projectName, page }) =>
  `https://api.github.com/repos/${projectOwner}/${projectName}/pulls?state=closed&page=${page}`;
