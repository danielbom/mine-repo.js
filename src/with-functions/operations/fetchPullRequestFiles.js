const Promise = require("bluebird");
const safeLength = require("./safeLength");
const computePercentage = require("./computePercentage");
const computePaginated = require("./computePaginated");
const { ITEMS_PER_PAGE } = require("./constants");

async function fetchPullRequestFiles({
  prefix,
  logger,
  timeIt,
  getPullRequestsCount,
  getPullRequests,
  fetchFiles,
  onFetchFilesComplete,
  storePullRequestFile,
  concurrency,
}) {
  const count = await getPullRequestsCount();

  logger.info(prefix + " Pull requests count: " + count);
  let i = 0;
  async function mapper(pr) {
    let page = 1;
    const currentCount = ++i;
    const percentage = computePercentage(currentCount, count);

    while (true) {
      let length = 0;
      const label = `${prefix} Fetching pull request files page(${page}) [${currentCount}|${count}] ${percentage}%`;
      await timeIt(label, async () => {
        const response = await fetchFiles(pr, page);
        page++;

        const data = response.data || [];
        length = safeLength(data);

        await Promise.map(data, (item) => storePullRequestFile(pr, item));
      });

      if (length !== ITEMS_PER_PAGE) break;
    }

    await onFetchFilesComplete(pr);
  }

  await computePaginated({
    mapper,
    concurrency,
    getPaginated: getPullRequests,
  });
}

module.exports = fetchPullRequestFiles;
