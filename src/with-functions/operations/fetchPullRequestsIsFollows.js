const Promise = require("bluebird");
const computePercentage = require("./computePercentage");

async function fetchPullRequestsIsFollows({
  prefix,
  timeIt,
  logger,
  isBot,
  getPullRequests,
  mapPullRequestToData,
  checkMustFetch,
  requesterIsSameAsMerger,
  fetchRequesterIsFollows,
  onFetchIsFollowsComplete,
  storePullRequestIsFollows,
  concurrency,
}) {
  const pullRequests = await getPullRequests();
  const count = pullRequests.length;

  logger.info(prefix + " Pull requests count: " + count);
  async function mapper(pr, i) {
    const data = mapPullRequestToData(pr);
    i = count - i;
    const percentage = computePercentage(i, count);

    const label = `${prefix} Requester follows merger [${i}|${count}] ${percentage}%`;
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
  await Promise.map(pullRequests, mapper, { concurrency });
}

module.exports = fetchPullRequestsIsFollows;
