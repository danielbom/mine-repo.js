const fs = require("fs");

function parseJson(json) {
  try {
    return JSON.parse(json);
  } catch (err) {
    return null;
  }
}

function _lineToCsv(line, isValid) {
  const mid = line.indexOf(" ");
  const project = line.slice(0, mid);
  const json = parseJson(line.slice(mid));
  if (json === null) {
    console.log({ line, json, project });
    console.log(`ERROR: ${line}\n`);
    return null;
  }
  return `${project},${json.closed_PR},${json.contributors},${json.stars},${
    isValid ? "✅" : "❌"
  }`;
}

function lineToCsv(line) {
  line = line.trim();
  return _lineToCsv(
    line.replace(/^#[^ ]*/, "").trim(),
    line.startsWith("#OK") || !line.startsWith("#")
  );
}

const args = process.argv.slice(2);
const filepath = args[0];
const n = Number(args[1]);

if (!filepath || isNaN(n) || n < 0) {
  throw new Error("Invalid arguments");
}

const data = fs.readFileSync(filepath).toString();
const lines = data.split("\n").slice(0, n);

lines.forEach((line) => {
  console.log(lineToCsv(line));
});
