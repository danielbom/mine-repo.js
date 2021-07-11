const ISSUES_PER_PAGE = 30;

function getInitialIssuesPage(total) {
  return Math.floor(total / ISSUES_PER_PAGE);
}

module.exports = getInitialIssuesPage;
