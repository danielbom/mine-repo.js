const fs = require("fs");

const fields = [
  "project_name",
  "language",
  "age",
  "stars",
  "contributors_count",
  "submitter_login",
  "merger_login",
  "pull_request_id",
  "files_changed_count",
  "changed_counts",
  "is_merged",
  "pr_comments_count",
  "has_test",
  "is_following",
  "followers_count",
  "is_collaborator",
  "prior_iterations_count",
];

const HEADER = fields.join(",");

function checkTransformation(data) {
  const invalidKeys = Object.keys(data).filter((key) => !fields.includes(key));
  if (invalidKeys.length > 0) {
    throw new Error(`Using invalid keys: ${invalidKeys.join("")}`);
  }
}

function isNil(obj) {
  return obj === null || obj === undefined;
}

function withDefault(defaultValue, value) {
  return isNil(value) ? defaultValue : value;
}

function fieldsToRow(data) {
  return (
    fields
      .map((key) => {
        const value = withDefault("", data[key]);
        if (typeof value === "boolean") return value ? 1 : 0;
        return value;
      })
      .join(",") + "\n"
  );
}

async function generateCsv({
  resultPath,
  getProject,
  getPullRequests,
  transformProject,
  transformPullRequest,
}) {
  // Extract data
  const project = await getProject();
  const pullRequests = await getPullRequests();

  const writer = fs.createWriteStream(resultPath);
  writer.write(HEADER + "\n");

  const projectFields = transformProject(project, pullRequests);
  checkTransformation(projectFields);

  pullRequests.forEach((pr) => {
    const pullRequestFields = transformPullRequest(pr);
    checkTransformation(pullRequestFields);
    writer.write(
      fieldsToRow({
        ...pullRequestFields,
        ...projectFields,
      })
    );
  });

  writer.end();
}

module.exports = generateCsv;
