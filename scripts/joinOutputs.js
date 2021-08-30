const fs = require("fs");
const path = require("path");
const Lazy = require("lazy.js");
const glob = require("fast-glob");

const OUTPUTS_PATH = path.join(__dirname, "..", "outputs");

async function readCsvPaths(inputPath) {
  const files = await glob("**/*.csv", { cwd: inputPath });
  return files.map((filePath) => path.join(inputPath, filePath));
}

async function joinOutputs(inputPath, outputPath) {
  const csvPaths = await readCsvPaths(inputPath);
  const n = csvPaths.length;
  if (n === 0)
    throw new Error("None CSV was found into outputs path: " + OUTPUTS_PATH);
  console.time("Total time");
  const outputStream = fs.createWriteStream(outputPath);

  for (let i = 0; i < n; i++) {
    const csvPath = csvPaths[i];

    await Lazy.readFile(csvPath)
      // @ts-ignore
      .lines()
      .filter((line) => line.length > 0)
      .each((line, index) => {
        if (i === 0 || index > 0) {
          outputStream.write(line + "\n");
        }
      });
  }

  outputStream.end();

  console.timeEnd("Total time");
}

const args = process.argv.slice(2);
if (args.length === 2) {
  joinOutputs(args[0], args[1]);
} else {
  console.error("Invalid number of arguments");
}
