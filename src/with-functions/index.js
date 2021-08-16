const fs = require("fs");
const os = require("os");
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
const groupBy = require("./groupBy");
const fetch = require("./fetch");
const sleep = require("./sleep");

const cleaners = require("./cleaners");

const { ITEMS_PER_PAGE } = require("./operations/constants");

async function _runner({
  projectOwner,
  projectName,
  logger,
  identifier,
  spinner,
  timeIt,
  concurrency,
}) {
  const PER_PAGE_QUERY = "&per_page=" + ITEMS_PER_PAGE;
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
              data: cleaners.pullRequests(data),
            });
          }
        },
        fetchPullRequests: async (page) => {
          const url = getClosedPullRequestsUrl({
            projectName,
            projectOwner,
            page,
          });
          return fetch(url + PER_PAGE_QUERY);
        },
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
              data: cleaners.issues(data),
            });
          }
        },
        fetchIssues(page) {
          const url = getClosedIssuesUrl({ projectName, projectOwner, page });
          return fetch(url + PER_PAGE_QUERY);
        },
        initialPage,
      });

      project.issuesCollected = true;
      await project.save();
    });
  }

  step++; // 4
  {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting individual pull requests", async () => {
      await fetchIndividualPullRequests({
        prefix,
        timeIt,
        logger,
        concurrency,
        getPullRequestsCount() {
          return db.models.pullRequest
            .find({
              project: project._id,
              individualPrCollected: false,
            })
            .countDocuments();
        },
        getPullRequests() {
          return db.models.pullRequest
            .find({
              project: project._id,
              individualPrCollected: false,
            })
            .limit(100)
            .lean();
        },
        fetchIndividualPullRequest: (pr) => fetch(pr.data.url),
        async storeIndividualPullRequest(pr, data) {
          const pullRequest = await db.models.pullRequest.findById(pr._id);
          pullRequest.data = cleaners.pullRequests(data);
          pullRequest.individualPrCollected = true;
          await pullRequest.save();
        },
      });
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
  if (false) {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting pull requests comments", async () => {
      await fetchPullRequestsComments({
        prefix,
        logger,
        timeIt,
        concurrency,
        getPullRequestsCount() {
          return db.models.pullRequest
            .find({
              project: project._id,
              commentsCollected: false,
            })
            .countDocuments();
        },
        getPullRequests() {
          return db.models.pullRequest
            .find({
              project: project._id,
              commentsCollected: false,
            })
            .limit(100)
            .lean();
        },
        fetchPullRequestComments: (pr, page) => {
          const url = `${pr.data.url}/comments?page=${page}`;
          return fetch(url + PER_PAGE_QUERY);
        },
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
    });
  }

  step++; // 5
  {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting all issues comments", async () => {
      await fetchIssuesComments({
        prefix,
        logger,
        timeIt,
        concurrency,
        getIssuesCount() {
          return db.models.issue
            .find({
              project: project._id,
              commentsCollected: false,
            })
            .countDocuments();
        },
        getIssues() {
          return db.models.issue
            .find({
              project: project._id,
              commentsCollected: false,
            })
            .limit(100)
            .lean();
        },
        async onFetchCommentsComplete(isu) {
          const issue = await db.models.issue.findById(isu._id);
          issue.commentsCollected = true;
          await issue.save();
        },
        fetchIssueComments: (isu, page) => {
          const url = `${isu.data.url}/comments?page=${page}`;
          return fetch(url + PER_PAGE_QUERY);
        },
        async storeIssueComment(isu, data) {
          const exists = await db.models.issueComment.findOne({
            "data.id": data.id,
            project: project._id,
          });
          if (!exists) {
            await db.models.issueComment.create({
              project: project._id,
              issue: isu._id,
              data: cleaners.issueComments(data),
            });
          }
        },
      });
    });
  }

  step++; // 6
  {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(
      prefix + " Collecting if requester follows merger",
      async () => {
        await fetchPullRequestsIsFollows({
          concurrency,
          prefix,
          logger,
          timeIt,
          getPullRequestsCount() {
            return db.models.pullRequest
              .find({
                project: project._id,
                isFollowsCollected: false,
                "data.merged_by": { $ne: null },
              })
              .countDocuments();
          },
          getPullRequests() {
            return db.models.pullRequest
              .find({
                project: project._id,
                isFollowsCollected: false,
                "data.merged_by": { $ne: null },
              })
              .limit(100)
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
            mergerLogin: pr.data.merged_by.login,
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
      }
    );
  }

  step++; // 7
  {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting pull requests files", async () => {
      await fetchPullRequestFiles({
        concurrency,
        prefix,
        logger,
        timeIt,
        getPullRequestsCount() {
          return db.models.pullRequest
            .find({
              project: project._id,
              filesCollected: false,
            })
            .countDocuments();
        },
        getPullRequests() {
          return db.models.pullRequest
            .find({
              project: project._id,
              filesCollected: false,
            })
            .limit(100)
            .lean();
        },
        fetchFiles: (pr, page) => {
          const url = `${pr.data.url}/files?page=${page}`;
          return fetch(url + PER_PAGE_QUERY);
        },
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
              data: cleaners.pullRequestFiles(data),
            });
          }
        },
      });
    });
  }

  step++; // 8
  {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Collecting pull request requesters", async () => {
      await fetchIndividualRequesters({
        concurrency,
        prefix,
        logger,
        timeIt,
        getPullRequestsCount() {
          return db.models.pullRequest
            .find({
              project: project._id,
              requestersCollected: false,
            })
            .countDocuments();
        },
        getPullRequests() {
          return db.models.pullRequest
            .find({
              project: project._id,
              requestersCollected: false,
            })
            .limit(100)
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
    });
  }

  step++; // 9
  {
    const prefix = `[${step}|${TOTAL_STEPS}]`;
    await timeIt(prefix + " Measure pull request last iterations", async () => {
      await measurePullRequestLastIterations({
        prefix,
        spinner,

        getPullRequestsCount() {
          return db.models.pullRequest
            .find({
              project: project._id,
              measureComputed: { $not: { $eq: true } },
            })
            .countDocuments();
        },
        getPullRequests() {
          return db.models.pullRequest
            .find({
              project: project._id,
              measureComputed: { $not: { $eq: true } },
            })
            .limit(100)
            .lean();
        },
        async calcPullRequestsIterations(pr) {
          const filter = {
            project: project._id,
            "data.user.login": pr.data.user.login,
            "data.created_at": { $lt: pr.data.created_at },
          };
          const pullRequests = db.models.pullRequest
            .find(filter)
            .countDocuments();
          const prsComments = db.models.pullRequestComment
            .find(filter)
            .countDocuments();
          const issues = db.models.issue.find(filter).countDocuments();
          const issueComments = db.models.issueComment
            .find(filter)
            .countDocuments();

          return {
            pullRequests: await pullRequests,
            prsComments: await prsComments,
            issues: await issues,
            issueComments: await issueComments,
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

          pullRequest.measureComputed = true;
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

    const followChecks = await db.models.followCheck
      .aggregate()
      .match({ project: project._id })
      .project({ pullRequest: 1, following: 1 });
    const requesters = await db.models.pullRequestRequester
      .aggregate()
      .match({ project: project._id })
      .project({ "data.followers": 1, requesterLogin: 1 });
    const files = await db.models.pullRequestFile
      .aggregate()
      .match({
        project: project._id,
        "data.filename": { $regex: "test", $options: "i" },
      })
      .group({ _id: "$pullRequest" });

    const hasTestMap = groupBy(files, (file) => file._id);
    const followChecksMap = groupBy(followChecks, (fc) => fc.pullRequest);
    const reqMap = groupBy(requesters, (req) => req.requesterLogin);

    await timeIt(prefix + " Generating CSV of " + identifier, async () => {
      await generateCsv({
        resultPath: path.join(outputPath, fileName),
        async getProject() {
          const [{ contributors_count }] = await db.models.pullRequest
            .aggregate()
            .match({
              project: project._id,
              "data.merged_at": { $ne: null },
            })
            .group({ _id: "$data.user.login" })
            .count("contributors_count");

          const createdAt = new Date(project.data.created_at);
          const updatedAt = new Date(project.data.updated_at);

          return {
            project_name: project.projectName,
            language: project.data.language,
            age: differenceInMonths(updatedAt, createdAt),
            stars: project.data.stargazers_count,
            contributors_count,
          };
        },
        async getPullRequests() {
          const prs = await db.models.pullRequest
            .aggregate()
            .match({ project: project._id })
            .project({
              _id: 1,
              createdAt: "$data.created_at",
              // CSV
              submitter_login: "$data.user.login",
              merger_login: "$data.merged_by.login",
              pull_request_id: "$data.number",
              files_changed_count: "$data.changed_files",
              changed_counts: {
                $add: ["$data.additions", "$data.deletions"],
              },
              is_merged: {
                $eq: [{ $type: "$data.merged_at" }, "string"],
              },
              pr_comments_count: "$data.comments",
              pr_review_comments_count: "$data.review_comments",
              is_collaborator: {
                $in: [
                  "$data.author_association",
                  ["OWNER", "MEMBER", "COLLABORATOR"],
                ],
              },
              prior_iterations_count: "$lastIterations",
            })
            .allowDiskUse(true)
            .sort({ createdAt: -1 });

          return prs.sort(cmpWith((x) => x.createdAt)).map((pr) => {
            const requester = reqMap[pr.submitter_login];
            const followCheck = followChecksMap[pr._id] || {};
            return {
              ...pr,
              has_test: Boolean(hasTestMap[pr._id]),
              is_following: Boolean(followCheck.following),
              followers_count: requester?.data?.followers || 0,
            };
          });
        },
      });
    });
  }

  {
    const msg = `Project ${identifier} collected successfully`;
    logger.info(msg);
    spinner.succeed(msg);
  }
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
    dnsError: 0,
  },
  nextTime = DEFAULT_RESTART_DELAY,
}) {
  const concurrency = Math.max(os.cpus().length, 2);

  let apiLimitReached = false; // http status code 403
  let invalidServerResponse = false; // http status code 502
  let axiosRequestTimeout = false; // timeout request
  let dnsError = false;

  try {
    // Test of API connection
    await fetch(getProjectUrl({ projectName, projectOwner }));

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
    const msg = `Error on mining the project ${identifier}`;
    logger.error(msg);
    spinner.fail(msg);
    let label = err.code ? `[${err.code}]: ` : "";

    logger.error(label + err.message);
    logger.error(err.stack);

    if (err.isAxiosError && err.response) {
      apiLimitReached = err.response.status === 403;
      invalidServerResponse = err.response.status === 502;
    } else {
      axiosRequestTimeout = err.code === "ECONNABORTED";
      dnsError = err.code === "EAI_AGAIN";
    }
  } finally {
    spinner.clear();
    await db.disconnect();
  }

  // retry
  if (apiLimitReached) {
    logger.error(`[${tries.apiLimitReached}] API limit reached`);
    if (tries.apiLimitReached === 3) {
      logger.error("Retries limit reached");
      return;
    }

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
        dnsError: 0,
      },
      nextTime,
    });
  }
  if (invalidServerResponse) {
    logger.error(`[${tries.invalidServerResponse}] Invalid Server Response`);
    if (tries.invalidServerResponse === 3) {
      logger.error("Retries limit reached");
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
        dnsError: 0,
      },
      nextTime,
    });
  }
  if (axiosRequestTimeout) {
    logger.error(`Timeout request`);

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
        dnsError: 0,
      },
      nextTime,
    });
  }
  if (dnsError) {
    logger.error(`[${tries.dnsError}] DNS error`);
    if (tries.dnsError === 3) {
      logger.error("Retries limit reached");
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
        invalidServerResponse: 0,
        dnsError: tries.dnsError + 1,
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
