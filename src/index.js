const runner = require("./lib");

const args = process.argv.slice(2);

const cmd = args.shift();

function help() {
  console.error("Usage: yarn start project [project-owner] [project-name]");
  console.error("Usage: yarn start file [filename]");
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
    break;
  }
  default: {
    help();
    break;
  }
}
