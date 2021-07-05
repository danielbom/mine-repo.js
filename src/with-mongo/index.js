// https://docs.github.com/en/rest/reference/pulls

const GitRepositoryCollector = require("./GitRepositoryCollector");
const db = require("./db");

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
