const computePaginated = require("./computePaginated");
const computePercentage = require("./computePercentage");

async function measurePullRequestLastIterations({
  prefix,
  spinner,

  getPullRequestsCount,
  getPullRequests,

  calcPullRequestsIterations,
  updatePullRequestIterations,
}) {
  const count = await getPullRequestsCount();

  let i = 0;
  async function mapper(pr) {
    const currentCount = ++i;
    const percentage = computePercentage(currentCount, count);
    spinner.text = `${prefix} Measuring pull request [${currentCount}|${count}] ${percentage}%`;

    const iterations = await calcPullRequestsIterations(pr);
    await updatePullRequestIterations(pr, iterations);
  }

  await computePaginated({
    mapper,
    concurrency: 8,
    getPaginated: getPullRequests,
  });
}

module.exports = measurePullRequestLastIterations;
