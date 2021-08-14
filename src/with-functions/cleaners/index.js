const ignoreWith = require("./ignoreWith");
const ignoredPullRequestFields = require("./ignoredPullRequestFields");

module.exports = {
  pullRequests: ignoreWith(ignoredPullRequestFields),
  pullRequestFiles: ignoreWith({ patch: true }),
  issues: ignoreWith({ body: true }),
  issueComments: ignoreWith({ body: true }),
};
