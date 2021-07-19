const { ITEMS_PER_PAGE } = require("./constants");

function getInitialIssuesPage(total) {
  return Math.floor(total / ITEMS_PER_PAGE);
}

module.exports = getInitialIssuesPage;
