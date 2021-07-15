const Promise = require("bluebird");
const safeLength = require("./safeLength");
const { ITEMS_PER_PAGE } = require("./constants");

async function fetchPullRequestsComments({
  opts,
  getPullRequests,
  fetchPullRequestComments,
  onFetchCommentsComplete,
  storePullRequestComment,
}) {
  const { timeIt } = opts;
  const pullRequests = await getPullRequests();
  const count = pullRequests.length;

  opts.logger.info("Pull requests count: " + count);
  for (let i = 0; i < count; i++) {
    const pr = pullRequests[i];
    let page = 1;
    const percentage = ((i / count) * 100).toFixed(0);

    while (true) {
      let length = 0;

      const label = `Fetching pull request comments: page(${page}) [${i}|${count}] ${percentage}%`;
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
}

module.exports = fetchPullRequestsComments;
