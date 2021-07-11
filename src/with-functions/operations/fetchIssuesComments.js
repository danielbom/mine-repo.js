const Promise = require("bluebird");
const safeLength = require("./safeLength");

async function fetchIssuesComments({
  opts,
  getIssues,
  fetchIssueComments,
  onFetchCommentsComplete,
  storeIssueComment,
}) {
  const { timeIt } = opts;
  const issues = await getIssues();
  const count = issues.length;

  opts.logger.info("Issues count: " + count);
  for (let i = 0; i < count; i++) {
    const isu = issues[i];
    let page = 1;

    while (true) {
      let length = 0;

      const label = `Fetching issue comment [${i}|${count}]: page ${page}`;
      await timeIt(label, async () => {
        const response = await fetchIssueComments(isu, page);
        page++;

        const data = response.data || [];
        length = safeLength(data);

        await Promise.map(data, (item) => storeIssueComment(isu, item));
      });

      if (length === 0) break;
    }

    await onFetchCommentsComplete(isu);
  }
}

module.exports = fetchIssuesComments;
