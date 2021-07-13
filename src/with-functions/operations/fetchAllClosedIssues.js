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
  let i = 0;

  while (true) {
    let length = 0;

    await timeIt(`Fetching issue: page(${page}) [${i}]`, async () => {
      const response = await fetchPullRequests(page);

      const data = response.data || [];
      length = safeLength(data);

      await Promise.map(data, storeIssues);
    });

    if (length === 0) break;

    page++;
    i++;
  }
}

module.exports = fetchAllClosedIssues;
