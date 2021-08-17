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

  async function fetchPage() {
    let length = 0;
    const currentPage = page++;
    await timeIt(`${prefix} Fetching issue page(${currentPage})`, async () => {
      const response = await fetchIssues(currentPage);

      const data = response.data || [];
      length = safeLength(data);

      await Promise.map(data, storeIssues);
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

module.exports = fetchAllClosedIssues;
