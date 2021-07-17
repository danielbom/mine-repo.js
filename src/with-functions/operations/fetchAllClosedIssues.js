const Promise = require("bluebird");
const safeLength = require("./safeLength");
const { ITEMS_PER_PAGE } = require("./constants");

async function fetchAllClosedIssues({
  prefix,
  timeIt,
  fetchIssues,
  initialPage,
  storeIssues,
}) {
  let page = initialPage;

  while (true) {
    let length = 0;

    await timeIt(`${prefix} Fetching issue page(${page})`, async () => {
      const response = await fetchIssues(page);

      const data = response.data || [];
      length = safeLength(data);

      await Promise.map(data, storeIssues);
    });

    if (length !== ITEMS_PER_PAGE) break;

    page++;
  }
}

module.exports = fetchAllClosedIssues;
