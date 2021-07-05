// https://docs.github.com/en/rest/reference/pulls

const Promise = require("bluebird");
const { differenceInMonths } = require("date-fns");

const db = require("./db");

const githubApi = require("../github-api");
const requester = githubApi.api;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(ms), ms);
  });
}

const CONCURRENCY = 20;
const P_OPTS = { concurrency: CONCURRENCY };
const PER_PAGE = 30;
const TODAY = new Date();

const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e-6;
function hrtimeMs(diffTimer) {
  return (diffTimer[0] * NS_PER_SEC + diffTimer[1]) * MS_PER_NS;
}

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

  _extractBasicDataFromPullRequest(pr) {
    // Quando o pull request é recusado, "mergedBy" é "null"
    let mergedBy = null;

    if (pr.merged_by) {
      mergedBy = {
        id: pr.merged_by.id,
        login: pr.merged_by.login,
      };
    }

    return {
      // Identificador
      id: pr.id,
      url: pr.url,
      // - Número de linhas modificadas, removidas e adicionadas
      // TODO: Verificar se está completo
      commits: pr.commits ?? null,
      additions: pr.additions ?? null,
      deletions: pr.deletions ?? null,
      // - Quantidade de arquivos alterados, removidos e adicionados
      fileChanges: pr.changed_files ?? null,
      // - Existem testes (caminhos dos arquivos contém "test")
      // TODO: É preciso verificar cada arquivo modificado para avaliar os arquivos
      commitsUrl: pr.commits_url ?? null,
      // - Solicitante é seguidor do gerente que aceitou
      // TODO: É preciso verificar se "mergedBy" é seguido por a "pullRequester"
      //       É necessário realizar uma chamada a API
      mergedBy,
      // - Quantidade de comentários
      comments: pr.comments ?? null,
      reviewComments: pr.review_comments ?? null,
      // - Número de colaboradores
      // TODO: É preciso contar o número de colaboradores
      pullRequester: {
        id: pr.user.id,
        login: pr.user.login,
        // - Número de seguidores
        // TODO: É preciso contar o número de seguidores
        followersUrl: pr.user.followers_url,
      },
      // - O pull request foi aceito
      wasAccepted: Boolean(pr.merged_at !== null || pr.merged),
      // Dates
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      closedAt: pr.closed_at,
      mergedAt: pr.merged_at,
    };
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

  async _extractBasicDataFromRepositoryData() {
    // TODO: Obter dos dados do projeto
    // - Número de usuários
    // TODO: Verificar o que o número de usuários significa (Rever a aula)

    const repo = this.project.data;
    const [{ contributorsCount }] = await db.models.pullRequest
      .aggregate()
      .match({ project: this.project._id })
      .group({
        _id: "$base.pullRequester.login",
        "base.wasAccepted": true,
      })
      .count("contributorsCount");

    const createdAt = new Date(repo.created_at);

    return {
      // - Idade do projeto (Em meses)
      countedAt: TODAY,
      createdAt,
      projectAge: differenceInMonths(TODAY, createdAt),
      // - Número de estrelas
      stars: repo.stargazers_count,
      // - Número de colaboradores: Quantidade de colaboradores únicos dos pull requests obtidos
      contributorsCount,
    };
  }

  _extractBasicDataFromPullRequestFile(prf) {
    return {
      sha: prf.sha,
      filename: prf.filename,
      status: prf.status,
      additions: prf.additions,
      deletions: prf.deletions,
      changes: prf.changes,
    };
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
              base: this._extractBasicDataFromPullRequestFile(pullRequestFile),
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

  async _aggregateFilesMeasures() {}

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
      await db.connect();
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

      if (!this.project.base) {
        this.project.base = await this._extractBasicDataFromRepositoryData();
        await this.project.save();
      }
    }

    // Collect pull requests files
    await this.collectPullRequestsFiles();

    // Collect individual pull requests
    await this.collectIndividualPullRequests();

    await this.checkIfRequesterFollowMerger();

    // this.project.base.filesMeasures = await this._aggregateFilesMeasures();

    await db.disconnect();

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

const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error("Invalid number of arguments");
  console.error("Usage: yarn mongo [project-owner] [project-name]");

  process.exit(1);
}

const [projectOwner, projectName] = args;
const collector = new GitRepositoryCollector(projectName, projectOwner);
collector.start();

process.on("error", (_err) => {
  db.disconnect();
});
