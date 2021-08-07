const Promise = require("bluebird");
const safeLength = require("./safeLength");
const computePercentage = require("./computePercentage");
const computePaginated = require("./computePaginated");
const { ITEMS_PER_PAGE } = require("./constants");

async function fetchIssuesComments({
  prefix,
  timeIt,
  logger,
  getIssuesCount,
  getIssues,
  fetchIssueComments,
  onFetchCommentsComplete,
  storeIssueComment,
  concurrency,
}) {
  const count = await getIssuesCount();

  logger.info(prefix + " Issues count: " + count);
  let i = 0;
  async function mapper(isu) {
    let page = 1;
    const currentCount = i++;
    const percentage = computePercentage(currentCount, count);

    while (true) {
      let length = 0;

      const label = `${prefix} Fetching issue comment page(${page}) [${currentCount}|${count}] ${percentage}%`;
      await timeIt(label, async () => {
        const response = await fetchIssueComments(isu, page);
        page++;

        const data = response.data || [];
        length = safeLength(data);

        await Promise.map(data, (item) => storeIssueComment(isu, item));
      });

      if (length !== ITEMS_PER_PAGE) break;
    }

    await onFetchCommentsComplete(isu);
  }
  await computePaginated({
    mapper,
    concurrency,
    getPaginated: getIssues,
  });
}

module.exports = fetchIssuesComments;
