const Promise = require("bluebird");
const safeLength = require("./safeLength");
const computePercentage = require("./computePercentage");
const { ITEMS_PER_PAGE } = require("./constants");

async function fetchPullRequestsComments({
  prefix,
  timeIt,
  logger,
  getPullRequests,
  fetchPullRequestComments,
  onFetchCommentsComplete,
  storePullRequestComment,
  concurrency,
}) {
  const pullRequests = await getPullRequests();
  const count = pullRequests.length;

  logger.info(prefix + " Pull requests count: " + count);
  async function mapper(pr, i) {
    let page = 1;
    i = count - i;
    const percentage = computePercentage(i, count);

    while (true) {
      let length = 0;

      const label = `${prefix} Fetching pull request comments page(${page}) [${i}|${count}] ${percentage}%`;
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
  await Promise.map(pullRequests, mapper, { concurrency });
}

module.exports = fetchPullRequestsComments;
