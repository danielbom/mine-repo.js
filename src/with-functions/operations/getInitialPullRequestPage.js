const PULL_REQUEST_PER_PAGE = 30;

function getInitialPullRequestPage(total) {
  return Math.floor(total / PULL_REQUEST_PER_PAGE);
}

module.exports = getInitialPullRequestPage;
