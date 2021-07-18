const fs = require("fs");
const readline = require("readline");

// https://stackoverflow.com/questions/6156501/read-a-file-one-line-at-a-time-in-node-js
async function readFileLines(filePath, fn) {
  const fileStream = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    await fn(line);
  }
}

module.exports = readFileLines;
