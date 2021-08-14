const db = require("../../database");
const ignoredPullRequestFields = require("./ignoredPullRequestFields");

function fieldsToProject(fields) {
  return Object.fromEntries(
    Object.keys(fields).map((key) => ["data." + key, 0])
  );
}

function ignoreField(field) {
  return function ignoreBody(model) {
    return model.updateMany(
      // Clean up field
      { [field]: { $exists: true } },
      [{ $project: { [field]: 0 } }]
    );
  };
}

async function cleanPullRequestDataOfDatabase() {
  await db.connect();

  await db.models.pullRequest.updateMany(
    // Clean up pull requests
    { selfData: { $exists: true } },
    [
      { $addFields: { data: "$selfData" } },
      {
        $project: {
          selfData: 0,
          ...fieldsToProject(ignoredPullRequestFields),
        },
      },
    ]
  );

  await ignoreField("data.patch")(db.models.pullRequestFile);
  await ignoreField("data.body")(db.models.issue);
  await ignoreField("data.body")(db.models.issueComment);

  await db.disconnect();
}

module.exports = cleanPullRequestDataOfDatabase;
