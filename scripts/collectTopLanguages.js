const fs = require("fs");
const api = require("../src/apis/github");
const config = require("../src/config");

api.defaults.headers.Authorization = `Bearer ${config.GITHUB_APIKEYS[0]}`;

function topLanguages({ language, page }) {
  return `https://api.github.com/search/repositories?q=language:${language}&sort=stars&order=desc&page=${page}`;
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
    return res.data.items;
  }

  if (!language) {
    usage();
    throw new Error("Expect language argument");
  }

  if (!output) {
    usage();
    throw new Error("Expect output argument");
  }

  const pages = await Promise.all([
    fetchPage(1),
    fetchPage(2),
    fetchPage(3),
    fetchPage(4),
    fetchPage(5),
    fetchPage(6),
    fetchPage(7),
  ]);
  const items = pages.reduce((arr, items) => {
    arr.push(...items);
    return arr;
  }, []);

  const max = items.reduce(
    (curr, x) => (curr.length < x.full_name.length ? x.full_name : curr),
    ""
  );

  fs.writeFileSync(
    output,
    items
      .sort((a, b) => (b.stargazers_count > a.stargazers_count ? 1 : -1))
      .map(
        (x) =>
          "#TODO " +
          x.full_name.padEnd(max.length, " ") +
          ` { "closed_PR": -1, "contributors": -1, "stars": ${x.stargazers_count} }`
      )
      .join("\n")
  );
}

run();
