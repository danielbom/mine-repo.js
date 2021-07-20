const Promise = require("bluebird");
const safeLength = require("./safeLength");
const computePercentage = require("./computePercentage");
const { ITEMS_PER_PAGE } = require("./constants");

async function fetchIssuesComments({
  prefix,
  timeIt,
  logger,
  getIssues,
  fetchIssueComments,
  onFetchCommentsComplete,
  storeIssueComment,
  concurrency,
}) {
  const issues = await getIssues();
  const count = issues.length;

  logger.info(prefix + " Issues count: " + count);
  async function mapper(isu, i) {
    let page = 1;
    i = count - i;
    const percentage = computePercentage(i, count);

    while (true) {
      let length = 0;

      const label = `${prefix} Fetching issue comment page(${page}) [${i}|${count}] ${percentage}%`;
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
  await Promise.map(issues, mapper, { concurrency });
}

module.exports = fetchIssuesComments;
