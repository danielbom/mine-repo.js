const Promise = require("bluebird");
const safeLength = require("./safeLength");

async function fetchAllClosedIssues({
  fetchPullRequests,
  initialPage,
  storeIssues,
  opts,
}) {
  const { timeIt } = opts;
  let page = initialPage;

  while (true) {
    let length = 0;

    await timeIt(`Fetching issue: page ${page}`, async () => {
      const response = await fetchPullRequests(page);
      page++;

      const data = response.data || [];
      length = safeLength(data);

      await Promise.map(data, storeIssues);
    });

    if (length === 0) break;
  }
}

module.exports = fetchAllClosedIssues;
