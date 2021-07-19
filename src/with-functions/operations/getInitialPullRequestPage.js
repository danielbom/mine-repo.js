const { ITEMS_PER_PAGE } = require("./constants");

function getInitialPullRequestPage(total) {
  return Math.floor(total / ITEMS_PER_PAGE);
}

module.exports = getInitialPullRequestPage;
