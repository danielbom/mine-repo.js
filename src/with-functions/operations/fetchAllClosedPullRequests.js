const Promise = require("bluebird");
const safeLength = require("./safeLength");

async function fetchAllClosedPullRequests({
  opts,
  fetchPullRequests,
  initialPage,
  storePullRequest,
}) {
  const { timeIt } = opts;
  let page = initialPage;

  while (true) {
    let length = 0;

    await timeIt(`Fetching pull requests: page ${page}`, async () => {
      const response = await fetchPullRequests(page);
      page++;

      const data = response.data || [];
      length = safeLength(data);

      await Promise.map(data, storePullRequest);
    });

    if (length === 0) break;
  }
}

module.exports = fetchAllClosedPullRequests;
