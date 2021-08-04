const fs = require("fs");
const path = require("path");
const Lazy = require("lazy.js");
const connect = require("./connect");

const OUTPUTS_PATH = path.join(__dirname, "outputs");

function queryExtraDataById(projectId) {
  return `
  SELECT p.id,
    p.url,
    COUNT(1) as pull_requests_count,
    COUNT(prh.\`action\` = 'merged') as merged_count,
    COUNT(prh.\`action\` = 'closed') as closed_count
  FROM projects p
  JOIN pull_requests pr ON pr.base_repo_id = p.id
  JOIN pull_request_history prh ON prh.pull_request_id = pr.id
  WHERE p.id = ${projectId}
    AND prh.\`action\` IN ('merged', 'closed')
  GROUP BY p.id;
  `;
}

async function* readProjects() {
  const files = await fs.promises.readdir(OUTPUTS_PATH);

  for await (const fileName of files) {
    const filePath = path.join(OUTPUTS_PATH, fileName);
    const data = await Lazy.readFile(filePath)
      // @ts-ignore
      .lines()
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (err) {
          return null;
        }
      })
      .filter((data) => data !== null)
      .toArray();

    for await (const item of data) {
      yield item;
    }
  }
}

function firstQueryResult(connection, query) {
  return new Promise(async (resolve, reject) => {
    const stream = await connection.query(query).stream({});

    let count = 0;
    for await (const data of stream) {
      if (count === 0) {
        resolve(data);
        count++;
      }
    }

    if (count !== 1) {
      reject();
    }
  });
}

async function run() {
  console.time("Total time");
  const connection = await connect();

  const result = {};
  for await (const project of readProjects()) {
    result[project.language] = result[project.language] || [];
    const extraDataQuery = queryExtraDataById(project.id);
    const extraData = await firstQueryResult(connection, extraDataQuery);

    result[project.language].push({
      ...project,
      url: extraData.url,
      merged_count: extraData.merged_count,
      closed_count: extraData.closed_count,
      pull_requests_count: extraData.pull_requests_count,
    });
  }

  console.log(JSON.stringify(result, null, 2));

  console.timeEnd("Total time");
  connection.end();
}

run();
