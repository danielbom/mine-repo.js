const ora = require("ora");

const db = require("../database");
const api = require("../apis/github");
const loadProject = require("./operations/loadProject");

const fetchProjectData = require("./operations/fetchProjectData");
const fetchAllClosedPullRequests = require("./operations/fetchAllClosedPullRequests");
const fetchAllClosedIssues = require("./operations/fetchAllClosedIssues");
const fetchIndividualPullRequests = require("./operations/fetchIndividualPullRequests");
const fetchPullRequestsComments = require("./operations/fetchPullRequestsComments");
const fetchIssuesComments = require("./operations/fetchIssuesComments");

const getInitialPullRequestPage = require("./operations/getInitialPullRequestPage");
const getInitialIssuesPage = require("./operations/getInitialIssuesPage");

const getProjectUrl = require("./operations/getProjectUrl");
const getClosedPullRequestsUrl = require("./operations/getClosedPullRequestsUrl");
const getClosedIssuesUrl = require("./operations/getClosedIssuesUrl");

const logger = require("./logger");
const parseMillisecondsIntoReadableTime = require("./parseMillisecondsIntoReadableTime");

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function raceFetchGet(url) {
  logger.info(url);
  const [data] = await Promise.all([api.get(url), sleep(400)]);
  return data;
}

async function _runner(projectOwner, projectName, opts) {
  const { timeIt } = opts;

  await db.connect();

  const project = await loadProject({
    storeProject: (data) => db.models.project.create(data),
    findProject: (filter) => db.models.project.findOne(filter),
    projectName,
    projectOwner,
  });

  if (!project.data) {
    await timeIt("Fetching project data", async () => {
      const data = await fetchProjectData({
        fetchProject: (data) => raceFetchGet(getProjectUrl(data)),
        projectName,
        projectOwner,
      });
      project.data = data;
      await project.save();
    });
  }

  if (!project.pullsCollected) {
    await timeIt("Collecting pull requests", async () => {
      const total = await db.models.pullRequest
        .find({ project: project._id })
        .countDocuments();
      const initialPage = getInitialPullRequestPage(total);

      await fetchAllClosedPullRequests({
        opts,
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
          raceFetchGet(
            getClosedPullRequestsUrl({ projectName, projectOwner, page })
          ),
        initialPage,
      });

      project.pullsCollected = true;
      await project.save();
    });
  }

  if (!project.issuesCollected) {
    await timeIt("Collecting issues", async () => {
      const total = await db.models.issue
        .find({ project: project._id })
        .countDocuments();
      const initialPage = getInitialIssuesPage(total);

      await fetchAllClosedIssues({
        opts,
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
        fetchPullRequests: (page) =>
          raceFetchGet(getClosedIssuesUrl({ projectName, projectOwner, page })),
        initialPage,
      });

      project.issuesCollected = true;
      await project.save();
    });
  }

  if (!project.individualPrCollected) {
    await timeIt("Collecting individual pull requests", async () => {
      await fetchIndividualPullRequests({
        opts,
        getPullRequests() {
          return db.models.pullRequest.find({
            project: project._id,
            individualPrCollected: false,
          });
        },
        fetchIndividualPullRequest: (pr) => raceFetchGet(pr.data.url),
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

  if (!project.commentsPrCollected) {
    await timeIt("Collecting pull requests comments", async () => {
      await fetchPullRequestsComments({
        opts,
        getPullRequests() {
          return db.models.pullRequest
            .find({
              project: project._id,
              commentsCollected: false,
            })
            .stream();
        },
        fetchPullRequestComments: (pr, page) =>
          raceFetchGet(`${pr.data.comments_url}?page=${page}`),
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

  if (!project.commentsIssueCollected) {
    await timeIt("Collecting issues comments", async () => {
      await fetchIssuesComments({
        opts,
        getIssues() {
          return db.models.issue.find({
            project: project._id,
            commentsCollected: false,
          });
        },
        async onFetchCommentsComplete(isu) {
          const issue = await db.models.issue.findById(isu._id);
          issue.commentsCollected = true;
          await issue.save();
        },
        fetchIssueComments: (isu, page) =>
          raceFetchGet(`${isu.data.comments_url}?page=${page}`),
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

  {
    const msg = `Project ${opts.identifier} collected successfully`;
    logger.info(msg);
    opts.spinner.succeed(msg);
  }

  await db.disconnect();
}

async function runner(projectOwner, projectName) {
  // Reference code of spinner
  // https://www.freecodecamp.org/news/schedule-a-job-in-node-with-nodecron/

  const identifier = `${projectOwner}/${projectName}`;
  const msg = `Starting mining the project ${identifier}`;
  logger.info(msg);
  const spinner = ora({
    text: msg,
    color: "blue",
    hideCursor: false,
  }).start();

  try {
    console.time("Total time");
    await _runner(projectOwner, projectName, {
      identifier,
      spinner,
      async timeIt(label, func) {
        spinner.text = label;

        const date = Date.now();
        await func();

        const ms = Date.now() - date;
        if (ms > 10000) {
          logger.info(`${label}: ${parseMillisecondsIntoReadableTime(ms)}`);
        } else {
          logger.info(`${label}: ${ms}ms`);
        }
      },
    });
    console.timeEnd("Total time");
  } catch (err) {
    // Print failed on the terminal if scraping is unsuccessful
    spinner.fail(`Error on mining the project ${identifier}`);
    // Remove the spinner from the terminal
    spinner.clear();
    // Print the error message on the terminal
    logger.error(err.message);
    logger.error(err.stack);
  }
}

module.exports = runner;
