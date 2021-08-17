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

  async function fetchPage() {
    let length = 0;
    const currentPage = page++;
    const label = `${prefix} Fetching pull requests page(${currentPage})`;
    await timeIt(label, async () => {
      const response = await fetchPullRequests(currentPage);

      const data = response.data || [];
      length = safeLength(data);

      await Promise.map(data, storePullRequest);
    });
    return length;
  }

  const initialLength = await fetchPage();
  if (initialLength !== ITEMS_PER_PAGE) return;

  while (true) {
    const promises = Array.from({ length: 4 }, fetchPage);
    const lengths = await Promise.all(promises);
    if (lengths.some((length) => length !== ITEMS_PER_PAGE)) break;
  }
}

module.exports = fetchAllClosedPullRequests;
