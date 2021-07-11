module.exports = ({ projectOwner, projectName, page }) =>
  `https://api.github.com/repos/${projectOwner}/${projectName}/issues?state=closed&page=${page}`;
