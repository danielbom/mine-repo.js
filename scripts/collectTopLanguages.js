const fs = require("fs");
const api = require("../src/apis/github");
const config = require("../src/config");

api.defaults.headers.Authorization = `Bearer ${config.GITHUB_APIKEYS[0]}`;

function topLanguages({ language, page }) {
  return `https://api.github.com/search/repositories?q=language:${language}&sort=stars&order=desc&page=${page}&per_page=100`;
}

function usage() {
  console.log("node collectTopLanguages.js [language] [output]");
}

async function run() {
  const args = process.argv.slice(2);
  const language = args[0];
  const output = args[1];

  async function fetchPage(page) {
    const url = topLanguages({ language, page });
    const res = await api.get(url);

    return res.data.items.map((x) => x.full_name).join("\n");
  }

  if (!language) {
    usage();
    throw new Error("Expect language argument");
  }

  if (!output) {
    usage();
    throw new Error("Expect output argument");
  }

  const pages = await Promise.all([fetchPage(1), fetchPage(2)]);
  fs.writeFileSync(output, pages.join("\n"));
}

run();
