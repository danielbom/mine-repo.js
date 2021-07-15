const Promise = require("bluebird");
const safeLength = require("./safeLength");
const { ITEMS_PER_PAGE } = require("./constants");

async function fetchIssuesComments({
  prefix,
  opts,
  getIssues,
  fetchIssueComments,
  onFetchCommentsComplete,
  storeIssueComment,
}) {
  const { timeIt } = opts;
  const issues = await getIssues();
  const count = issues.length;

  opts.logger.info(prefix + " Issues count: " + count);
  for (let i = 0; i < count; i++) {
    const isu = issues[i];
    let page = 1;
    const percentage = ((i / count) * 100).toFixed(0);

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
}

module.exports = fetchIssuesComments;
