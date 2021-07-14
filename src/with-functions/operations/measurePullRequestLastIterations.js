const Promise = require("bluebird");

async function measurePullRequestLastIterations({
  // Collect
  getPullRequests,
  getPullRequestComments,
  getIssues,
  getIssuesComments,
  // Extract
  calcPullRequestsIterations,
  updatePullRequestIterations,
}) {
  const elements = {
    pullRequests: await getPullRequests(),
    pullRequestComments: await getPullRequestComments(),
    issues: await getIssues(),
    issueComments: await getIssuesComments(),
  };

  await Promise.each(elements.pullRequests, async (pr) => {
    const iterations = await calcPullRequestsIterations(elements, pr);
    await updatePullRequestIterations(pr, iterations);
  });
}

module.exports = measurePullRequestLastIterations;
