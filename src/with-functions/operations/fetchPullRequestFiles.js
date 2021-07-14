const Promise = require("bluebird");
const safeLength = require("./safeLength");

async function fetchPullRequestFiles({
  opts,
  getPullRequests,
  fetchFiles,
  onFetchFilesComplete,
  storePullRequestFile,
}) {
  const { timeIt } = opts;
  const pullRequests = await getPullRequests();
  const count = pullRequests.length;

  opts.logger.info("Pull requests count: " + count);
  for (let i = 0; i < count; i++) {
    const pr = pullRequests[i];
    let page = 1;
    const percentage = ((i / count) * 100).toFixed(0);

    while (true) {
      let length = 0;
      const label = `Fetching pull request files page(${page}) [${i}|${count}] ${percentage}%`;
      await timeIt(label, async () => {
        const response = await fetchFiles(pr, page);
        page++;

        const data = response.data || [];
        length = safeLength(data);

        await Promise.map(data, (item) => storePullRequestFile(pr, item));
      });

      if (length === 0) break;
    }

    await onFetchFilesComplete(pr);
  }
}

module.exports = fetchPullRequestFiles;
