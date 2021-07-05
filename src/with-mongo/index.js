// https://docs.github.com/en/rest/reference/pulls

const GitRepositoryCollector = require("./GitRepositoryCollector");
const MetricsExtractor = require("./MetricsExtractor");
const db = require("./db");

async function runCollector() {
  try {
    const args = process.argv.slice(2);

    if (args.length !== 2) {
      console.error("Invalid number of arguments");
      console.error("Usage: yarn mongo [project-owner] [project-name]");

      process.exit(1);
    }

    const [projectOwner, projectName] = args;
    const collector = new GitRepositoryCollector(projectName, projectOwner);
    await collector.start();
  } catch (err) {
    return err;
  }
}

async function run() {
  await db.connect();

  process.on("error", (_err) => {
    db.disconnect();
  });

  let error = await runCollector();

  const extractor = new MetricsExtractor();
  await extractor.start();

  await db.disconnect();

  if (error) throw error;
}

run();
