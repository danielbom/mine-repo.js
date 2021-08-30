// const runner = require("./with-class");
const manageDatabaseUpdates = require("./database/manageDatabaseUpdates");
const runner = require("./with-functions");
const readFileLines = require("./readFileLines");

const args = process.argv.slice(2);

const cmd = args.shift();

function help() {
  console.error("Usage: yarn mine project [project-owner] [project-name]");
  console.error("Usage: yarn mine file [filename]");
}

async function run() {
  await manageDatabaseUpdates();

  switch (cmd) {
    case "project": {
      if (args.length === 1 && args[0].includes("/")) {
        const project = args[0].split("/");
        runner(project[0], project[1]);
      } else if (args.length === 2) {
        runner(args[0], args[1]);
      } else {
        console.error("Invalid number of arguments");
        help();
      }
      break;
    }
    case "file": {
      if (args.length === 1) {
        readFileLines(args[0], (line) => {
          line = line.trim();

          if (line.startsWith("#")) return;

          let project = line.split(/\s+/);

          if (project[0].includes("/")) {
            project = project[0].split("/");
          }

          if (project.length === 2) {
            return runner(project[0], project[1]);
          }
        });
      } else {
        console.error("Invalid number of arguments");
        help();
      }
      break;
    }
  }
}

run();
