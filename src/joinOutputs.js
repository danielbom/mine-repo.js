const fs = require("fs");
const path = require("path");
const Lazy = require("lazy.js");

const OUTPUTS_PATH = path.join(__dirname, "..", "outputs");

async function readCsvPaths() {
  const files = await fs.promises.readdir(OUTPUTS_PATH);
  return files
    .filter((filePath) => filePath.endsWith(".csv"))
    .map((filePath) => path.join(OUTPUTS_PATH, filePath));
}

async function joinOutputs(outputPath) {
  const outputStream = fs.createWriteStream(outputPath);
  const csvPaths = await readCsvPaths();
  const n = csvPaths.length;
  if (n === 0)
    throw new Error("None CSV was found into outputs path: " + OUTPUTS_PATH);

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
}

module.exports = joinOutputs;
