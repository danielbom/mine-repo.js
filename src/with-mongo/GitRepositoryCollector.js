const Promise = require("bluebird");

const db = require("./db");
const { hrtimeMs } = require("./utils");

const githubApi = require("../github-api");
const requester = githubApi.api;

const CONCURRENCY = 20;
const P_OPTS = { concurrency: CONCURRENCY };
const PER_PAGE = 30;

class GitRepositoryCollector {
  constructor(projectName, projectOwner) {
    this.projectName = projectName;
    this.projectOwner = projectOwner;

    this.project = null;

    this.pullRequestsCount = 0;
    this.pullRequestsFilesCount = 0;

    this.requestsCount = 0;
    this.urls = githubApi.urlsBuilder({ projectOwner, projectName });
  }

  async httpGetRequest(url, options = null) {
    console.log(`Request: ${url}`);
    this.requestsCount++;
    try {
      const data = await requester.get(url, options);
      return data;
    } catch (err) {
      const statusCode = err?.response?.status ?? 0;
      console.log(`ERROR[${statusCode}]: Request: ${url}`);

      // API rate limit exceeded
      if (statusCode === 403) throw new Error("API rate limit exceeded");

      return err?.response;
    }
  }

  async httpGetRequestTimed(url, options = null) {
    console.log(`Request: ${url}`);
    const data = await this.httpGetRequest(url, options);
    console.timeEnd("Request time");
    return data;
  }

  async collectRepositoryData() {
    const url = this.urls.getRepositoryUrl();
    const response = await this.httpGetRequest(url);
    const data = response.data;
    this.project.data = data;
    await this.project.save();
  }

  async collectAllClosedPullRequests() {
    let page = Math.floor(this.pullRequestsCount / PER_PAGE) + 1;

    while (true) {
      const url = this.urls.getClosedPullRequestsUrl({ page });
      page++;

      const response = await this.httpGetRequest(url);

      const data = response.data;
      const length = data?.length ?? 0;

      await Promise.map(
        data,
        async (pullRequest) => {
          const pullRequestExists = await db.models.pullRequest.findOne({
            "data.id": pullRequest.id,
          });
          if (!pullRequestExists) {
            await db.models.pullRequest.create({
              project: this.project,
              data: pullRequest,
            });
          }
        },
        P_OPTS
      );

      if (length === 0) break;
    }
  }

  async _collectPullRequestFiles(pr) {
    let page = 1;

    while (true) {
      const url = `${pr.data.url}/files?page=${page}`;
      page++;

      const response = await this.httpGetRequest(url);

      const data = response.data;
      const length = data?.length ?? 0;

      await Promise.map(
        data || [],
        async (pullRequestFile) => {
          const pullRequestFileExists = await db.models.pullRequestFile.findOne(
            { "data.sha": pullRequestFile.sha }
          );
          if (!pullRequestFileExists) {
            pullRequestFile.patch = undefined;

            await db.models.pullRequestFile.create({
              project: this.project,
              pullRequest: pr,
              data: pullRequestFile,
            });
          }
        },
        P_OPTS
      );

      if (length === 0) break;
    }
  }

  async collectPullRequestsFiles() {
    const prs = db.models.pullRequest
      .find({
        project: this.project._id,
        filesCollected: false,
      })
      .stream();

    for await (const pr of prs) {
      await this._collectPullRequestFiles(pr);
      await db.models.pullRequest.findByIdAndUpdate(pr._id, {
        filesCollected: true,
      });
    }
  }

  async _collectIndividualPullRequest(pr) {
    const url = pr.data.url;
    const response = await this.httpGetRequest(url);
    const data = response.data;

    await db.models.pullRequest.findByIdAndUpdate(pr._id, {
      selfData: data,
      individualPrCollected: true,
    });
  }

  async collectIndividualPullRequests() {
    const prs = db.models.pullRequest
      .find({
        project: this.project._id,
        individualPrCollected: false,
      })
      .stream();

    const promises = [];
    for await (const pr of prs) {
      promises.push(this._collectIndividualPullRequest(pr));

      if (promises.length === 5) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }
    await Promise.all(promises);
  }

  async checkIfRequesterFollowMerger() {
    const prs = db.models.pullRequest
      .find({
        project: this.project._id,
        "selfData.merged_by": { $ne: null },
      })
      .stream();

    for await (const pr of prs) {
      const requesterLogin = pr.selfData.user.login;
      const mergerLogin = pr.selfData.merged_by.login;

      const followCheck = await db.models.followCheck
        .findOne({
          requesterLogin,
          mergerLogin,
        })
        .lean();

      if (!followCheck) {
        const sameAsMerger = requesterLogin === mergerLogin;

        if (sameAsMerger) {
          await db.models.followCheck.create({
            requesterLogin,
            mergerLogin,
            sameAsMerger: true,
            following: false,
          });
        } else {
          const url = this.urls.getRequesterFollowsMergerUrl({
            requesterLogin,
            mergerLogin,
          });
          const response = await this.httpGetRequest(url);

          await db.models.followCheck.create({
            requesterLogin,
            mergerLogin,
            sameAsMerger: false,
            following: response.status === 204,
          });
        }
      }
    }
  }

  async start() {
    // https://stackoverflow.com/questions/48768758/measure-process-time-with-node-js
    const startTimer = process.hrtime();

    const identifier = `${this.projectOwner}:${this.projectName}`;
    console.log(`Start Collect Pull Requests of "${identifier}"`);
    console.time("Total time");

    // Collect project data
    {
      const project = {
        projectName: this.projectName,
        projectOwner: this.projectOwner,
      };
      this.project = await db.models.project.findOne(project);

      if (!this.project) {
        this.project = await db.models.project.create(project);
        await this.collectRepositoryData();
      } else {
        this.pullRequestsCount = await db.models.pullRequest.countDocuments({
          project: this.project,
        });
      }
    }

    // Collect pull requests
    {
      if (!this.project.pullsCollected) {
        await this.collectAllClosedPullRequests();
        this.project.pullsCollected = true;
        await this.project.save();
      }
    }

    await this.collectPullRequestsFiles();
    await this.collectIndividualPullRequests();
    await this.checkIfRequesterFollowMerger();

    // Logging end
    {
      const diffTimer = process.hrtime(startTimer);
      console.log(`End Collect Pull Requests of "${identifier}"`);
      console.timeEnd("Total time");

      console.table([
        {
          requestsCount: this.requestsCount,
          totalTime: Number(hrtimeMs(diffTimer).toFixed(2)),
        },
      ]);
    }
  }
}

module.exports = GitRepositoryCollector;
