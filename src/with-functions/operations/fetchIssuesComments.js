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
  const issues = getIssues();

  for await (const isu of issues) {
    let page = 1;

    while (true) {
      let length = 0;

      await timeIt(`Fetching issue comment: page ${page}`, async () => {
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
