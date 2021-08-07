const Promise = require("bluebird");
const safeLength = require("./safeLength");
const computePercentage = require("./computePercentage");
const computePaginatedPullRequests = require("./computePaginatedPullRequests");
const { ITEMS_PER_PAGE } = require("./constants");

async function fetchPullRequestsComments({
  prefix,
  timeIt,
  logger,
  getPullRequestsCount,
  getPullRequests,
  fetchPullRequestComments,
  onFetchCommentsComplete,
  storePullRequestComment,
  concurrency,
}) {
  const count = await getPullRequestsCount();

  logger.info(prefix + " Pull requests count: " + count);
  let i = 0;
  async function mapper(pr) {
    let page = 1;
    const currentCount = i++;
    const percentage = computePercentage(currentCount, count);

    while (true) {
      let length = 0;

      const label = `${prefix} Fetching pull request comments page(${page}) [${currentCount}|${count}] ${percentage}%`;
      await timeIt(label, async () => {
        const response = await fetchPullRequestComments(pr, page);
        page++;

        const data = response.data || [];
        length = safeLength(data);

        await Promise.map(data, (item) => storePullRequestComment(pr, item));
      });

      if (length !== ITEMS_PER_PAGE) break;
    }

    await onFetchCommentsComplete(pr);
  }
  await computePaginatedPullRequests({
    mapper,
    concurrency,
    getPullRequests,
  });
}

module.exports = fetchPullRequestsComments;
