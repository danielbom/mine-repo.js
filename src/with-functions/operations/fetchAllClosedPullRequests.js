const Promise = require("bluebird");
const safeLength = require("./safeLength");
const { ITEMS_PER_PAGE } = require("./constants");

async function fetchAllClosedPullRequests({
  prefix,
  timeIt,
  fetchPullRequests,
  initialPage,
  storePullRequest,
}) {
  let page = initialPage;

  while (true) {
    let length = 0;

    await timeIt(`${prefix} Fetching pull requests page(${page})`, async () => {
      const response = await fetchPullRequests(page);

      const data = response.data || [];
      length = safeLength(data);

      await Promise.map(data, storePullRequest);
    });

    if (length !== ITEMS_PER_PAGE) break;

    page++;
  }
}

module.exports = fetchAllClosedPullRequests;
