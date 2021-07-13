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
  let i = 0;

  while (true) {
    let length = 0;

    await timeIt(`Fetching pull requests: page(${page}) [${i}]`, async () => {
      const response = await fetchPullRequests(page);

      const data = response.data || [];
      length = safeLength(data);

      await Promise.map(data, storePullRequest);
    });

    if (length === 0) break;

    page++;
    i++;
  }
}

module.exports = fetchAllClosedPullRequests;
