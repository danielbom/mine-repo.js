const db = require("./db");
const { monthsUntilToday, TODAY } = require("./utils");

const baseNotExists = {
  $or: [{ base: { $exists: false } }, { base: null }],
};

class MetricsExtractor {
  async extractPullRequestFileData() {
    const files = db.models.pullRequestFile.find(baseNotExists).stream();

    const promises = [];
    for await (const f of files) {
      const file = await db.models.pullRequestFile.findById(f._id);
      file.base = {
        sha: file.sha,
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      };
      promises.push(file.save());

      if (promises.length === 500) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }
    await Promise.all(promises);
  }

  async _extractProjectData(project) {
    // TODO: Obter dos dados do projeto
    // - Número de usuários
    // TODO: Verificar o que o número de usuários significa (Rever a aula)

    const repo = project.data;
    const [{ contributorsCount }] = await db.models.pullRequest
      .aggregate()
      .match({ project: project._id })
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
      projectAge: monthsUntilToday(createdAt),
      // - Número de estrelas
      stars: repo.stargazers_count,
      // - Número de colaboradores: Quantidade de colaboradores únicos dos pull requests obtidos
      contributorsCount,
    };
  }

  async extractProjectData() {
    const projects = db.models.project.find(baseNotExists).stream();

    const promises = [];
    for await (const p of projects) {
      const project = await db.models.project.findById(p._id);
      project.base = this._extractProjectData(project);
      promises.push(project.save());

      if (promises.length === 500) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }
    await Promise.all(promises);
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

    const promises = [];
    for await (const pr of pullRequests) {
      const pullRequest = await db.models.pullRequest.findById(pr._id);
      pullRequest.base = this._extractPullRequestData(pullRequest.data);
      promises.push(pullRequest.save());

      if (promises.length === 500) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }
    await Promise.all(promises);
  }

  async start() {
    console.log(`Start Extract metrics`);

    console.time("Total time");
    await this.extractProjectData();
    await this.extractPullRequestFileData();
    await this.extractPullRequestData();
    console.timeEnd("Total time");
  }
}

module.exports = MetricsExtractor;
