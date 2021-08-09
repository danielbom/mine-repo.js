const computePercentage = require("./computePercentage");
const computePaginated = require("./computePaginated");

async function fetchPullRequestsIsFollows({
  prefix,
  timeIt,
  logger,
  isBot,
  getPullRequestsCount,
  getPullRequests,
  mapPullRequestToData,
  checkMustFetch,
  requesterIsSameAsMerger,
  fetchRequesterIsFollows,
  onFetchIsFollowsComplete,
  storePullRequestIsFollows,
  concurrency,
}) {
  const count = await getPullRequestsCount();

  logger.info(prefix + " Pull requests count: " + count);
  let i = 0;
  async function mapper(pr) {
    const data = mapPullRequestToData(pr);
    const currentCount = ++i;
    const percentage = computePercentage(currentCount, count);

    const label = `${prefix} Requester follows merger [${currentCount}|${count}] ${percentage}%`;
    await timeIt(label, async () => {
      if (!isBot(data)) {
        const mustFetch = await checkMustFetch(data);

        if (mustFetch) {
          if (requesterIsSameAsMerger(data)) {
            await storePullRequestIsFollows(pr, data, {
              following: false,
              sameAsMerger: true,
            });
          } else {
            const following = await fetchRequesterIsFollows(data);
            await storePullRequestIsFollows(pr, data, {
              following,
              sameAsMerger: false,
            });
          }
        }
      }

      await onFetchIsFollowsComplete(pr);
    });
  }
  await computePaginated({
    mapper,
    concurrency,
    getPaginated: getPullRequests,
  });
}

module.exports = fetchPullRequestsIsFollows;
