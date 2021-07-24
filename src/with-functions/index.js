const fs = require("fs");
const path = require("path");
const ora = require("ora");
const { differenceInMonths } = require("date-fns");

const db = require("../database");
const config = require("../config");
const api = require("../apis/github");

const loadProject = require("./operations/loadProject");

const fetchProjectData = require("./operations/fetchProjectData");
const fetchAllClosedPullRequests = require("./operations/fetchAllClosedPullRequests");
const fetchAllClosedIssues = require("./operations/fetchAllClosedIssues");
const fetchIndividualPullRequests = require("./operations/fetchIndividualPullRequests");
const fetchPullRequestsComments = require("./operations/fetchPullRequestsComments");
const fetchIssuesComments = require("./operations/fetchIssuesComments");
const fetchPullRequestsIsFollows = require("./operations/fetchPullRequestsIsFollows");
const fetchIndividualRequesters = require("./operations/fetchIndividualRequesters");
const fetchPullRequestFiles = require("./operations/fetchPullRequestFiles");

const measurePullRequestLastIterations = require("./operations/measurePullRequestLastIterations");

const getInitialPullRequestPage = require("./operations/getInitialPullRequestPage");
const getInitialIssuesPage = require("./operations/getInitialIssuesPage");

const getProjectUrl = require("./operations/getProjectUrl");
const getClosedIssuesUrl = require("./operations/getClosedIssuesUrl");
const getUserInformationUrl = require("./operations/getUserInformationUrl");
const getClosedPullRequestsUrl = require("./operations/getClosedPullRequestsUrl");
const getRequesterFollowsMergerUrl = require("./operations/getRequesterFollowsMergerUrl");

const generateCsv = require("./operations/generateCsv");

const logger = require("./logger");
const parseMillisecondsIntoReadableTime = require("./parseMillisecondsIntoReadableTime");
const countBy = require("./countBy");
const groupBy = require("./groupBy");
const fetch = require("./fetch");
const sleep = require("./sleep");

async function _runner({
  projectOwner,
  projectName,
  logger,
  identifier,
  spinner,
  timeIt,
  concurrency,
}) {
  const TOTAL_STEPS = 10;
  let step = 0;

  spinner.start();
  await db.connect();

  const project = await loadProject({
    storeProject: (data) => db.models.project.create(data),
    findProject: (filter) => db.models.project.findOne(filter),
    projectName,
    projectOwner,
  });

  step++; // 1
  if (!project.data) {
    await timeIt(`[${step}|${TOTAL_STEPS}] Fetching project data`, async () => {
      const data = await fetchProjectData({
        projectName,
        projectOwner,
        fetchProject: (data) => fetch(getProjectUrl(data)),
      });
      project.data = data;
      await project.save();
    });
  }

  step++; // 2
  if (!project.pullsCollected) {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting pull requests", async () => {
      const total = await db.models.pullRequest
        .find({ project: project._id })
        .countDocuments();
      const initialPage = getInitialPullRequestPage(total);

      await fetchAllClosedPullRequests({
        prefix,
        timeIt,
        async storePullRequest(data) {
          const exists = await db.models.pullRequest.findOne({
            project: project._id,
            "data.id": data.id,
          });
          if (!exists) {
            await db.models.pullRequest.create({
              project: project._id,
              data,
            });
          }
        },
        fetchPullRequests: async (page) =>
          fetch(getClosedPullRequestsUrl({ projectName, projectOwner, page })),
        initialPage,
      });

      project.pullsCollected = true;
      await project.save();
    });
  }

  step++; // 3
  if (!project.issuesCollected) {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting issues", async () => {
      const total = await db.models.issue
        .find({ project: project._id })
        .countDocuments();
      const initialPage = getInitialIssuesPage(total);

      await fetchAllClosedIssues({
        prefix,
        timeIt,
        async storeIssues(data) {
          const issueExists = await db.models.issue.findOne({
            project: project._id,
            "data.id": data.id,
          });

          if (!issueExists) {
            await db.models.issue.create({
              project: project._id,
              data,
            });
          }
        },
        fetchIssues: (page) =>
          fetch(getClosedIssuesUrl({ projectName, projectOwner, page })),
        initialPage,
      });

      project.issuesCollected = true;
      await project.save();
    });
  }

  step++; // 4
  if (!project.individualPrCollected) {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting individual pull requests", async () => {
      await fetchIndividualPullRequests({
        prefix,
        timeIt,
        logger,
        concurrency,
        getPullRequests() {
          return db.models.pullRequest
            .find({
              project: project._id,
              individualPrCollected: false,
            })
            .lean();
        },
        fetchIndividualPullRequest: (pr) => fetch(pr.data.url),
        async storeIndividualPullRequest(pr, data) {
          const pullRequest = await db.models.pullRequest.findById(pr._id);
          pullRequest.selfData = data;
          pullRequest.individualPrCollected = true;
          await pullRequest.save();
        },
      });

      project.individualPrCollected = true;
      await project.save();
    });
  }

  // Step removed because prs are interpreted as issues
  // Then, I only fetch comments of issues.
  //
  // References:
  // - https://github.com/paularmstrong/normalizr
  // - https://stackoverflow.com/questions/33374778/how-can-i-get-the-number-of-github-issues-using-the-github-api
  //
  // step++;
  if (false && !project.commentsPrCollected) {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting pull requests comments", async () => {
      await fetchPullRequestsComments({
        prefix,
        logger,
        timeIt,
        concurrency,
        getPullRequests() {
          return db.models.pullRequest
            .find({
              project: project._id,
              commentsCollected: false,
            })
            .lean();
        },
        fetchPullRequestComments: (pr, page) =>
          fetch(`${pr.data.url}/comments?page=${page}`),
        async onFetchCommentsComplete(pr) {
          const pullRequest = await db.models.pullRequest.findById(pr._id);
          pullRequest.commentsCollected = true;
          await pullRequest.save();
        },
        async storePullRequestComment(pr, data) {
          const exists = await db.models.pullRequestComment.findOne({
            "data.id": data.id,
            pullRequest: pr._id,
          });
          if (!exists) {
            await db.models.pullRequestComment.create({
              project: project._id,
              pullRequest: pr._id,
              data,
            });
          }
        },
      });

      project.commentsPrCollected = true;
      await project.save();
    });
  }

  step++; // 5
  if (!project.commentsIssueCollected) {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting all issues comments", async () => {
      await fetchIssuesComments({
        prefix,
        logger,
        timeIt,
        concurrency,
        getIssues() {
          return db.models.issue
            .find({
              project: project._id,
              commentsCollected: false,
            })
            .lean();
        },
        async onFetchCommentsComplete(isu) {
          const issue = await db.models.issue.findById(isu._id);
          issue.commentsCollected = true;
          await issue.save();
        },
        fetchIssueComments: (isu, page) =>
          fetch(`${isu.data.url}/comments?page=${page}`),
        async storeIssueComment(isu, data) {
          const exists = await db.models.issueComment.findOne({
            "data.id": data.id,
            project: project._id,
          });
          if (!exists) {
            await db.models.issueComment.create({
              project: project._id,
              issue: isu._id,
              data,
            });
          }
        },
      });

      project.commentsIssueCollected = true;
      await project.save();
    });
  }

  step++; // 6
  if (!project.isFollowsCollected) {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(
      prefix + " Collecting if requester follows merger",
      async () => {
        await fetchPullRequestsIsFollows({
          concurrency,
          prefix,
          logger,
          timeIt,
          getPullRequests() {
            return db.models.pullRequest
              .find({
                project: project._id,
                isFollowsCollected: false,
                "selfData.merged_by": { $ne: null },
              })
              .lean();
          },
          async checkMustFetch({ mergerLogin, requesterLogin }) {
            const exists = await db.models.followCheck.findOne({
              project: project._id,
              mergerLogin,
              requesterLogin,
            });
            return !exists;
          },
          mapPullRequestToData: (pr) => ({
            requesterLogin: pr.data.user.login,
            mergerLogin: pr.selfData.merged_by.login,
          }),
          requesterIsSameAsMerger: (data) =>
            data.requesterLogin === data.mergerLogin,
          isBot: (data) => data.requesterLogin.includes("[bot]"),
          async fetchRequesterIsFollows(data) {
            const url = getRequesterFollowsMergerUrl(data);
            const request = await fetch(url);
            return request.status === 204;
          },
          async onFetchIsFollowsComplete(pr) {
            const pullRequest = await db.models.pullRequest.findById(pr._id);
            pullRequest.isFollowsCollected = true;
            await pullRequest.save();
          },
          async storePullRequestIsFollows(
            pr,
            { mergerLogin, requesterLogin },
            { following, sameAsMerger }
          ) {
            await db.models.followCheck.create({
              project: project._id,
              pullRequest: pr._id,
              requesterLogin,
              mergerLogin,
              following,
              sameAsMerger,
            });
          },
        });

        project.isFollowsCollected = true;
        await project.save();
      }
    );
  }

  step++; // 7
  if (!project.filesCollected) {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting pull requests files", async () => {
      await fetchPullRequestFiles({
        concurrency,
        prefix,
        logger,
        timeIt,
        getPullRequests() {
          return db.models.pullRequest
            .find({
              project: project._id,
              filesCollected: false,
            })
            .lean();
        },
        fetchFiles: (pr, page) => fetch(`${pr.data.url}/files?page=${page}`),
        async onFetchFilesComplete(pr) {
          const pullRequest = await db.models.pullRequest.findById(pr._id);
          pullRequest.filesCollected = true;
          await pullRequest.save();
        },
        async storePullRequestFile(pr, data) {
          const exists = await db.models.pullRequestFile.findOne({
            project: project._id,
            pullRequest: pr._id,
            "data.sha": data.sha,
          });

          if (!exists) {
            await db.models.pullRequestFile.create({
              project: project._id,
              pullRequest: pr._id,
              data,
            });
          }
        },
      });

      project.filesCollected = true;
      await project.save();
    });
  }

  step++; // 8
  if (!project.requestersCollected) {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting pull request requesters", async () => {
      await fetchIndividualRequesters({
        concurrency,
        prefix,
        logger,
        timeIt,
        getPullRequests() {
          return db.models.pullRequest
            .find({
              project: project._id,
              requestersCollected: false,
            })
            .lean();
        },
        getRequesterLogin: (pr) => pr.data.user.login,
        async checkMustFetch(requesterLogin) {
          const exists = await db.models.pullRequestRequester.findOne({
            requesterLogin,
          });
          return !exists;
        },
        async onFetchRequesterComplete(pr) {
          const pullRequest = await db.models.pullRequest.findById(pr._id);
          pullRequest.requestersCollected = true;
          await pullRequest.save();
        },
        fetchRequesterData: (requesterLogin) =>
          fetch(getUserInformationUrl(requesterLogin)),
        async storeRequesterData(requesterLogin, data) {
          await db.models.pullRequestRequester.create({
            project: project._id,
            requesterLogin,
            data,
          });
        },
      });

      project.isFollowsCollected = true;
      await project.save();
    });
  }

  step++; // 9
  {
    function countLastIteration(xs, pr) {
      return countBy(
        xs,
        (x) =>
          x.data.user.login === pr.data.user.login &&
          x.data.created_at < pr.data.created_at
      );
    }

    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Measure pull request last iterations", async () => {
      await measurePullRequestLastIterations({
        getPullRequests: () =>
          db.models.pullRequest
            .aggregate()
            .match({ project: project._id, "data.user": { $ne: null } })
            .sort({ "data.created_at": -1 }),
        getPullRequestComments: () =>
          db.models.pullRequestComment
            .find({ project: project._id, "data.user": { $ne: null } })
            .lean(),
        getIssues: () =>
          db.models.issue
            .find({ project: project._id, "data.user": { $ne: null } })
            .lean(),
        getIssuesComments: () =>
          db.models.issueComment
            .find({ project: project._id, "data.user": { $ne: null } })
            .lean(),

        async calcPullRequestsIterations(elements, pr) {
          return {
            pullRequests: countLastIteration(elements.pullRequests, pr),
            prsComments: countLastIteration(elements.pullRequestComments, pr),
            issues: countLastIteration(elements.issues, pr),
            issueComments: countLastIteration(elements.issueComments, pr),
          };
        },
        async updatePullRequestIterations(pr, counts) {
          const pullRequest = await db.models.pullRequest.findById(pr._id);
          pullRequest.pullRequestsCount = counts.pullRequests;
          pullRequest.prsCommentsCount = counts.prsComments;
          pullRequest.issuesCount = counts.issues;
          pullRequest.issueCommentsCount = counts.issueComments;

          // Pull requests are ignored because they are collected with issues
          pullRequest.lastIterations = counts.issues + counts.issueComments;
          await pullRequest.save();
        },
      });
    });
  }

  step++; // 10
  {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    const rootPath = path.join(__dirname, "..", "..");
    const outputPath = path.join(rootPath, "outputs");
    const fileName = `${projectName}.csv`;

    const cmpWith = (keyGetter) => {
      return (a, b) => {
        const key1 = keyGetter(a);
        const key2 = keyGetter(b);
        return key1 < key2 ? 1 : key1 === key2 ? 0 : -1;
      };
    };

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath);
    }

    await timeIt(prefix + " Generating CSV of " + identifier, async () => {
      await generateCsv({
        resultPath: path.join(outputPath, fileName),
        getProject: () => project.toJSON(),
        async getPullRequests() {
          const prs = await db.models.pullRequest
            .find({ project: project._id })
            .lean();
          const followChecks = await db.models.followCheck
            .find({ project: project._id })
            .lean();
          const requesters = await db.models.pullRequestRequester
            .find({ project: project._id })
            .lean();

          const files = await db.models.pullRequestFile
            .aggregate()
            .match({
              project: project._id,
              "data.filename": {
                $regex: "test",
                $options: "i",
              },
            })
            .group({ _id: "$pullRequest" });

          const hasTestMap = groupBy(files, (file) => file._id);
          const followChecksMap = groupBy(followChecks, (fc) => fc.pullRequest);
          const reqMap = groupBy(requesters, (req) => req.requesterLogin);

          return prs.sort(cmpWith((x) => x.selfData.created_at)).map((pr) => {
            const association = pr.selfData.author_association;
            const requesterLogin = pr.data.user.login;
            const requester = reqMap[requesterLogin];
            const followCheck = followChecksMap[pr._id] || {};
            return {
              ...pr,
              hasTest: Boolean(hasTestMap[pr._id]),
              isFollowing: Boolean(followCheck.following),
              isCollaborator: ["OWNER", "MEMBER", "COLLABORATOR"].includes(
                association
              ),
              requesterFollowers: requester?.data?.followers || 0,
            };
          });
        },
        transformProject(project, pullRequests) {
          const contributorsDict = pullRequests.reduce((dict, pr) => {
            if (pr.selfData.merged_at) {
              const requesterLogin = pr.data.user.login;
              dict[requesterLogin] = (dict[requesterLogin] || 0) + 1;
            }
            return dict;
          }, {});
          const createdAt = new Date(project.data.created_at);
          const updatedAt = new Date(project.data.updated_at);

          return {
            project_name: project.projectName,
            language: project.data.language,
            age: differenceInMonths(updatedAt, createdAt),
            stars: project.data.stargazers_count,
            contributors_count: Object.keys(contributorsDict).length,
          };
        },
        transformPullRequest(pr) {
          return {
            submitter_login: pr.data.user.login,
            merger_login: pr.selfData.merged_by?.login,
            pull_request_id: pr.selfData.number,
            files_changed_count: pr.selfData.changed_files,
            changed_counts: pr.selfData.additions + pr.selfData.deletions,
            is_merged: typeof pr.selfData.merged_at === "string",
            pr_comments_count: pr.selfData.comments || 0,
            has_test: pr.hasTest,
            prior_iterations_count: pr.lastIterations,
            is_following: pr.isFollowing,
            is_collaborator: pr.isCollaborator,
            followers_count: pr.requesterFollowers,
          };
        },
      });
    });
  }

  {
    const msg = `Project ${identifier} collected successfully`;
    logger.info(msg);
    spinner.succeed(msg);
  }

  await db.disconnect();
}

const DEFAULT_RESTART_DELAY = 60_000;

async function runnerWithRetry({
  identifier,
  projectName,
  projectOwner,
  spinner,
  timeIt,
  tries = {
    apiLimitReached: 0,
    invalidServerResponse: 0,
  },
  nextTime = DEFAULT_RESTART_DELAY,
}) {
  const concurrency = Math.max(config.GITHUB_APIKEYS.length, 1);
  let apiLimitReached = false; // http status code 403
  let invalidServerResponse = false; // http status code 502
  let axiosRequestTimeout = false; // timeout request

  try {
    // Test of API connection
    await api.get(getProjectUrl({ projectName, projectOwner }));

    await _runner({
      projectOwner,
      projectName,
      logger,
      identifier,
      spinner,
      timeIt,
      concurrency,
    });
  } catch (err) {
    spinner.fail(`Error on mining the project ${identifier}`);
    spinner.clear();

    logger.info(err.message);
    logger.error(err.stack);

    await db.disconnect();

    if (err.isAxiosError && err.response) {
      apiLimitReached = err.response.status === 403;
      invalidServerResponse = err.response.status === 502;
    } else {
      axiosRequestTimeout = err.code === "ECONNABORTED";
    }
  }

  // retry
  if (apiLimitReached) {
    logger.info(`[${tries.apiLimitReached}] API limit reached`);
    logger.info("Waiting 1 min to try again...");
    await sleep(nextTime);
    await runnerWithRetry({
      identifier,
      projectName,
      projectOwner,
      spinner,
      timeIt,
      tries: {
        apiLimitReached: tries.apiLimitReached + 1,
        invalidServerResponse: 0,
      },
      nextTime,
    });
  }
  if (invalidServerResponse) {
    logger.info(`[${tries.invalidServerResponse}] Invalid Server Response`);
    if (tries.invalidServerResponse === 10) {
      logger.info("Retries limit reached");
      return;
    }

    logger.info("Waiting 10 secs. to try again...");
    await sleep(10_000);
    await runnerWithRetry({
      identifier,
      projectName,
      projectOwner,
      spinner,
      timeIt,
      tries: {
        apiLimitReached: 0,
        invalidServerResponse: tries.invalidServerResponse + 1,
      },
      nextTime,
    });
  }
  if (axiosRequestTimeout) {
    logger.info(`Timeout request`);

    logger.info("Waiting 10 secs. to try again...");
    await sleep(10_000);
    await runnerWithRetry({
      identifier,
      projectName,
      projectOwner,
      spinner,
      timeIt,
      tries: {
        apiLimitReached: 0,
        invalidServerResponse: 0,
      },
      nextTime,
    });
  }
}

async function runner(projectOwner, projectName) {
  async function timeIt(label, func) {
    spinner.text = label;
    logger.info(label);

    const date = Date.now();
    await func().finally(() => {
      const ms = Date.now() - date;
      if (ms > 10000) {
        logger.info(`${label}: ${parseMillisecondsIntoReadableTime(ms)}`);
      } else {
        logger.info(`${label}: ${ms}ms`);
      }
    });
  }

  // Reference code of spinner
  // https://www.freecodecamp.org/news/schedule-a-job-in-node-with-nodecron/

  const identifier = `${projectOwner}/${projectName}`;
  const msg = `Starting mining the project ${identifier}`;
  logger.info(msg);
  const spinner = ora({
    text: msg,
    color: "blue",
    hideCursor: false,
  });

  await timeIt(`Run of project ${identifier}`, async () => {
    await runnerWithRetry({
      spinner,
      identifier,
      projectName,
      projectOwner,
      timeIt,
    });
  });
}

module.exports = runner;
