const Promise = require("bluebird");

const db = require("../database");
const { hrtimeMs, urlsBuilder, sleep } = require("./utils");

const api = require("../apis/github");

const CONCURRENCY = 20;
const P_OPTS = { concurrency: CONCURRENCY };

const PULL_REQUEST_PER_PAGE = 30;
const TIMEOUT_RETRY_DELAY = 5000;

class GitCollector {
  constructor(projectName, projectOwner) {
    this.projectName = projectName;
    this.projectOwner = projectOwner;
    this.identifier = `${projectOwner}:${projectName}`;

    this.project = null;

    this.pullRequestsCount = 0;
    this.pullRequestsFilesCount = 0;

    this.requestsCount = 0;
    this.urls = urlsBuilder({ projectOwner, projectName });
  }

  async _tryGet(tries, url) {
    this.requestsCount++;
    console.log(`Request [${this.requestsCount}, ${tries}]: ${url}`);
    try {
      const data = await api.get(url);
      return data;
    } catch (err) {
      const statusCode = err?.response?.status ?? 0;
      console.log(`ERROR[${statusCode}]: Request: ${url}`);

      if (statusCode === 404) return {};

      if (statusCode === 403) {
        throw new Error("API rate limit exceeded");
      }
      if (err.isAxiosError && err.message.includes("timeout")) {
        if (tries < 3) {
          await sleep(TIMEOUT_RETRY_DELAY);
          return await this._tryGet(tries + 1, url);
        } else {
          throw new Error("API timeout exceeded");
        }
      }

      console.log(err);
      throw new Error("API untreated error");
    }
  }

  async _get0(url) {
    return await this._tryGet(0, url);
  }

  async _get(url) {
    console.time(`Request time ${url}`);
    const data = await this._get0(url);
    console.timeEnd(`Request time ${url}`);
    return data;
  }

  async loadProject() {
    const project = {
      projectName: this.projectName,
      projectOwner: this.projectOwner,
    };
    this.project = await db.models.project.findOne(project);

    if (!this.project) {
      this.project = await db.models.project.create(project);

      if (!this.project.data) {
        const url = this.urls.getRepository();
        const response = await this._get(url);
        const data = response.data;
        this.project.data = data;
      }
      if (!this.project.languages) {
        const url = this.urls.getLanguages();
        const response = await this._get(url);
        this.project.languages = response.data;
      }

      await this.project.save();
    } else {
      this.pullRequestsCount = await db.models.pullRequest.countDocuments({
        project: this.project,
      });
    }
  }

  async collectAllClosedPullRequests() {
    if (this.project.pullsCollected) return;

    let page = Math.floor(this.pullRequestsCount / PULL_REQUEST_PER_PAGE) + 1;

    while (true) {
      const url = this.urls.getClosedPullRequests({ page });
      page++;

      const response = await this._get(url);

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

    this.project.pullsCollected = true;
    await this.project.save();
  }

  async _collectPullRequestFiles(pr) {
    let page = 1;

    const promises = [];
    let running = true;
    while (running) {
      const url = `${pr.data.url}/files?page=${page}`;
      page++;

      promises.push(
        (async () => {
          const response = await this._get(url);

          const data = response.data;
          const length = data?.length ?? 0;

          await Promise.map(
            data || [],
            async (pullRequestFile) => {
              const pullRequestFileExists =
                await db.models.pullRequestFile.findOne({
                  "data.sha": pullRequestFile.sha,
                });

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
          if (length === 0) running = false;
        })()
      );

      if (promises.length === 2) await Promise.all(promises);
    }
    await Promise.all(promises);
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
      const pullRequest = await db.models.pullRequest.findById(pr._id);
      pullRequest.filesCollected = true;
      await pullRequest.save();
    }
  }

  async _collectIndividualPullRequest(pr) {
    const url = pr.data.url;
    const response = await this._get(url);
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
            project: this.project._id,
            pullRequest: pr._id,
            requesterLogin,
            mergerLogin,
            sameAsMerger: true,
            following: false,
          });
        } else {
          const url = this.urls.getRequesterFollowsMerger({
            requesterLogin,
            mergerLogin,
          });
          const response = await this._get(url);

          await db.models.followCheck.create({
            project: this.project._id,
            pullRequest: pr._id,
            requesterLogin,
            mergerLogin,
            sameAsMerger: false,
            following: response.status === 204,
          });
        }
      }
    }
  }

  async collectRequesterInformation() {
    const followChecks = await db.models.followCheck
      .find({ project: this.project._id, data: null })
      .stream();

    for await (const fc of followChecks) {
      const url = this.urls.getUserInformation(fc.requesterLogin);
      const response = await this._get(url);

      const followCheck = await db.models.followCheck.findById(fc._id);
      followCheck.data = response.data;
      await followCheck.save();
    }
  }

  async _collectPullRequestComments(pr) {
    let page = 1;

    const promises = [];
    let running = true;
    while (running) {
      const url = `${pr.data.comments_url}?page=${page}`;
      page++;

      promises.push(
        (async () => {
          const response = await this._get(url);

          const data = response.data;
          const length = data?.length ?? 0;

          await Promise.map(
            data || [],
            async (pullRequestComment) => {
              const pullRequestCommentExists =
                await db.models.pullRequestComment.findOne({
                  "data.id": pullRequestComment.id,
                });

              if (!pullRequestCommentExists) {
                await db.models.pullRequestComment.create({
                  project: this.project._id,
                  pullRequest: pr._id,
                  data: pullRequestComment,
                });
              }
            },
            P_OPTS
          );
          if (length === 0) running = false;
        })()
      );

      if (promises.length === 2) await Promise.all(promises);
    }
    await Promise.all(promises);
  }

  async collectAllPullRequestComments() {
    const prs = db.models.pullRequest
      .find({
        project: this.project._id,
        commentsCollected: false,
      })
      .stream();

    for await (const pr of prs) {
      await this._collectPullRequestComments(pr);
      const pullRequest = await db.models.pullRequest.findById(pr._id);
      pullRequest.commentsCollected = true;
      await pullRequest.save();
    }
  }

  _startTimer() {
    // https://stackoverflow.com/questions/48768758/measure-process-time-with-node-js
    this.startTimer = process.hrtime();

    console.log(`Start Collect Pull Requests of "${this.identifier}"`);
    console.time("Total time");
  }

  _endTimer() {
    const diffTimer = process.hrtime(this.startTimer);
    console.log(`End Collect Pull Requests of "${this.identifier}"`);
    console.timeEnd("Total time");

    console.table([
      {
        requestsCount: this.requestsCount,
        totalTime: Number(hrtimeMs(diffTimer).toFixed(2)),
      },
    ]);
  }

  async start() {
    this._startTimer();
    await this.loadProject();
    await this.collectAllClosedPullRequests();
    await this.collectPullRequestsFiles();
    await this.collectIndividualPullRequests();
    await this.checkIfRequesterFollowMerger();
    await this.collectRequesterInformation();
    await this.collectAllPullRequestComments();
    this._endTimer();
  }
}

module.exports = GitCollector;
