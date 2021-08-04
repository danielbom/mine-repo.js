const connect = require("./connect");

function queryByLanguage(language) {
  return `
  SELECT p.id, p.name, p.language, w.watchers_count
  FROM projects p
  JOIN (SELECT w.repo_id, COUNT(1) AS watchers_count
        FROM watchers w
        GROUP BY w.repo_id
      ) w ON w.repo_id = p.id
  WHERE p.\`language\` = '${language}'
    AND p.forked_from IS NULL
    AND p.id IN (
      SELECT DISTINCT pr.base_repo_id
      FROM pull_requests pr
      WHERE pr.id IN (
        SELECT DISTINCT prh1.pull_request_id
        FROM pull_request_history prh1
        WHERE prh1.\`action\` IN ('merged', 'closed') AND
          prh1.actor_id IN (
            SELECT DISTINCT prh.actor_id
            FROM pull_request_history prh
            GROUP BY prh.actor_id
            HAVING COUNT(prh.actor_Id) >= 3
          )
      )
    )
  ORDER BY w.watchers_count DESC
  LIMIT 200;`;
}

async function run() {
  const args = process.argv.slice(2);
  const language = args[0];

  console.time("Total time");
  const connection = await connect();

  const rows = connection.query(queryByLanguage(language)).stream({});

  for await (const row of rows) {
    console.log(JSON.stringify(row));
  }

  console.timeEnd("Total time");
  connection.end();
}

run();
