const ignoreWith = require("./ignoreWith");

module.exports = {
  pullRequests: ignoreWith({
    assignees: true,
    requested_reviewers: true,
    requested_teams: true,
    body: true,
  }),
  pullRequestFiles: ignoreWith({ patch: true }),
  issues: ignoreWith({ body: true }),
  issueComments: ignoreWith({ body: true }),
};
