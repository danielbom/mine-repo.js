// const runner = require("./with-class");
const runner = require("./with-functions");
const db = require("./database");
const readFileLines = require("./readFileLines");
const joinOutputs = require("./joinOutputs");

const args = process.argv.slice(2);

const cmd = args.shift();

function help() {
  console.error("Usage: yarn mine project [project-owner] [project-name]");
  console.error("Usage: yarn mine file [filename]");
  console.error("Usage: yarn mine join-outputs [output-path]");
}

switch (cmd) {
  case "project": {
    if (args.length === 2) {
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
        const project = line
          .split(/\s/)
          .slice(0, 2)
          .map((x) => x.trim());

        return runner(project[0], project[1]);
      });
    } else {
      console.error("Invalid number of arguments");
      help();
    }
    break;
  }
  case "join-outputs":
    if (args.length === 1) {
      joinOutputs(args[0]);
    } else {
      console.error("Invalid number of arguments");
      help();
    }
    break;
  case "clear": {
    db.connect()
      .then(() => db.clear())
      .then(() => db.disconnect());
    break;
  }
  default: {
    help();
    break;
  }
}
