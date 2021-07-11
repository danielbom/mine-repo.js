const Promise = require("bluebird");
const safeLength = require("./safeLength");

async function fetchPullRequestsComments({
  opts,
  getPullRequests,
  fetchPullRequestComments,
  onFetchCommentsComplete,
  storePullRequestComment,
}) {
  const { timeIt } = opts;
  const pullRequests = getPullRequests();

  for await (const pr of pullRequests) {
    let page = 1;

    while (true) {
      let length = 0;

      await timeIt(`Fetching issue comment: page ${page}`, async () => {
        const response = await fetchPullRequestComments(pr, page);
        page++;

        const data = response.data || [];
        length = safeLength(data);

        await Promise.map(data, (item) => storePullRequestComment(pr, item));
      });

      if (length === 0) break;
    }

    await onFetchCommentsComplete(pr);
  }
}

module.exports = fetchPullRequestsComments;
