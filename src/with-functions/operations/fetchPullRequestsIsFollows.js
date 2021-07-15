async function fetchPullRequestsIsFollows({
  prefix,
  opts,
  getPullRequests,
  mapPullRequestToData,
  checkMustFetch,
  requesterIsSameAsMerger,
  fetchRequesterIsFollows,
  onFetchIsFollowsComplete,
  storePullRequestIsFollows,
}) {
  const { timeIt } = opts;
  const pullRequests = await getPullRequests();
  const count = pullRequests.length;

  opts.logger.info(prefix + " Pull requests count: " + count);
  for (let i = 0; i < count; i++) {
    const pr = pullRequests[i];
    const data = mapPullRequestToData(pr);
    const percentage = ((i / count) * 100).toFixed(0);

    const label = `${prefix} Requester follows merger [${i}|${count}] ${percentage}%`;
    await timeIt(label, async () => {
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

      await onFetchIsFollowsComplete(pr);
    });
  }
}

module.exports = fetchPullRequestsIsFollows;
