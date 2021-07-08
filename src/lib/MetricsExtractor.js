const db = require("../database");
const { monthsUntilToday, TODAY } = require("../utils");

const baseNotExists = {
  $or: [{ base: { $exists: false } }, { base: null }],
};

class MetricsExtractor {
  async extractWith(data, extractor) {
    const promises = [];
    for await (const item of data) {
      promises.push(extractor(item));

      if (promises.length === 32) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }
    await Promise.all(promises);
  }

  async extractPullRequestFileData() {
    const files = db.models.pullRequestFile.find(baseNotExists).stream();

    await this.extractWith(files, async (f) => {
      const file = await db.models.pullRequestFile.findById(f._id);
      file.base = {
        sha: file.sha,
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      };
      await file.save();
    });
  }

  async _extractProjectData(project) {
    // TODO: Obter dos dados do projeto
    // - Número de usuários
    // TODO: Verificar o que o número de usuários significa (Rever a aula)

    const repo = project.data;
    const [{ contributorsCount }] = await db.models.pullRequest
      .aggregate()
      .match({ project: project._id, "data.merged_at": { $ne: null } })
      .group({ _id: "$data.user.login" })
      .count("contributorsCount");

    const createdAt = new Date(repo.created_at);

    return {
      // - Idade do projeto (Em meses)
      countedAt: TODAY,
      createdAt,
      projectAge: monthsUntilToday(createdAt),
      // - Número de estrelas
      stars: repo.stargazers_count,
      // - Número de colaboradores: Quantidade de colaboradores únicos dos pull requests obtidos
      contributorsCount,
    };
  }

  async extractProjectData() {
    const projects = db.models.project.find(baseNotExists).stream();

    await this.extractWith(projects, async (p) => {
      const project = await db.models.project.findById(p._id);
      project.base = await this._extractProjectData(p);
      await project.save();
    });
  }

  _extractPullRequestData(pr) {
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

  async extractPullRequestData() {
    const pullRequests = db.models.pullRequest.find(baseNotExists).stream();

    await this.extractWith(pullRequests, async (pr) => {
      const pullRequest = await db.models.pullRequest.findById(pr._id);
      pullRequest.base = this._extractPullRequestData(pullRequest.data);
      await pullRequest.save();
    });
  }

  async extractMainLanguage() {
    const projects = db.models.project
      .find({ "base.mainLanguage": { $exists: false } })
      .stream();

    await this.extractWith(projects, async (p) => {
      const project = await db.models.project.findById(p._id);

      const mainLanguage = Object.entries(project.languages)
        .map(([language, count]) => ({ language, count }))
        .reduce((curr, next) => {
          if (curr === null) {
            return next;
          } else {
            return curr.count > next.count ? curr : next;
          }
        }, null);

      project.base = {
        ...project.base,
        mainLanguage,
      };
      await project.save();
    });
  }

  async extractTestsExistence() {
    const pullRequests = db.models.pullRequest
      .find({ "base.existsTests": { $exists: false } })
      .stream();

    await this.extractWith(pullRequests, async (pr) => {
      const pullRequest = await db.models.pullRequest.findById(pr._id);
      const existFile = await db.models.pullRequestFile.findOne({
        pullRequest: pr._id,
        "data.filename": {
          $regex: "test",
          $options: "i",
        },
      });
      pullRequest.base = {
        ...pullRequest.base,
        existsTests: Boolean(existFile),
      };
      await pullRequest.save();
    });
  }

  async start() {
    console.log(`Start Extract metrics`);

    console.time("Total time");
    await this.extractProjectData();
    await this.extractPullRequestFileData();
    await this.extractPullRequestData();
    await this.extractMainLanguage();
    await this.extractTestsExistence();
    console.timeEnd("Total time");
  }
}

module.exports = MetricsExtractor;
