// https://docs.github.com/en/rest/reference/pulls

const GitRepositoryCollector = require("./GitRepositoryCollector");
const MetricsExtractor = require("./MetricsExtractor");
const db = require("../database");

async function runCollector({ projectOwner, projectName }) {
  try {
    const collector = new GitRepositoryCollector(projectName, projectOwner);
    await collector.start();
  } catch (err) {
    return err;
  }
}

async function runner(projectOwner, projectName) {
  await db.connect();

  process.on("error", (_err) => {
    db.disconnect();
  });

  const error = await runCollector({ projectOwner, projectName });

  const extractor = new MetricsExtractor();
  await extractor.start();

  await db.disconnect();

  if (error) throw error;
}

module.exports = runner;
