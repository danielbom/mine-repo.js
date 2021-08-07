const Promise = require("bluebird");
const computePercentage = require("./computePercentage");

async function measurePullRequestLastIterations({
  prefix,
  spinner,
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
  const count = elements.pullRequests.length;

  let i = 0;
  await Promise.each(elements.pullRequests, async (pr) => {
    const currentCount = i++;
    const percentage = computePercentage(currentCount, count);
    spinner.text = `${prefix} Measuring pull request [${currentCount}|${count}] ${percentage}%`;

    const iterations = await calcPullRequestsIterations(elements, pr);
    await updatePullRequestIterations(pr, iterations);
  });
}

module.exports = measurePullRequestLastIterations;
