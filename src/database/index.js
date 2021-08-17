const config = require("../config");

const mongoose = require("mongoose");

const ObjectId = { type: mongoose.Types.ObjectId, required: true };
const RequiredString = { type: String, required: true };
const RequiredBoolean = { type: Boolean, required: true };
const RequiredObject = { type: Object, required: true };
const DefaultFalse = { type: Boolean, default: false };

const ControlSchema = new mongoose.Schema(
  { version: { type: Number, required: true, default: 0 } },
  { timestamps: true }
);

const ProjectSchema = new mongoose.Schema(
  {
    projectName: RequiredString,
    projectOwner: RequiredString,
    data: Object, // Response of github API
    base: Object, // Basic data extracted
    languages: Object, // Response of github API
    pullsCollected: DefaultFalse,
    issuesCollected: DefaultFalse,
  },
  { timestamps: true }
);

const PullRequestSchema = new mongoose.Schema(
  {
    project: ObjectId,
    data: RequiredObject, // Response of github API
    base: Object, // Basic data extracted
    pullRequestsCount: Number,
    prsCommentsCount: Number,
    issuesCount: Number,
    issueCommentsCount: Number,
    lastIterations: Number,
    filesCollected: DefaultFalse,
    commentsCollected: DefaultFalse,
    individualPrCollected: DefaultFalse,
    isFollowsCollected: DefaultFalse,
    requestersCollected: DefaultFalse,
    measureComputed: DefaultFalse,
  },
  { timestamps: true }
);
PullRequestSchema.index({ "data.user.login": -1 }, { name: "requester" });
PullRequestSchema.index({ "data.id": -1 }, { name: "identifier" });

const IssueSchema = new mongoose.Schema(
  {
    project: ObjectId,
    data: RequiredObject, // Response of github API
    base: Object, // Basic data extracted
    commentsCollected: DefaultFalse,
  },
  { timestamps: true }
);
IssueSchema.index({ "data.user.login": -1 }, { name: "requester" });
IssueSchema.index({ "data.id": -1 }, { name: "identifier" });

const IssueCommentSchema = new mongoose.Schema(
  {
    project: ObjectId,
    issue: ObjectId,
    data: RequiredObject, // Response of github API
  },
  { timestamps: true }
);
IssueCommentSchema.index({ "data.user.login": -1 }, { name: "requester" });
IssueCommentSchema.index({ "data.id": -1 }, { name: "identifier" });

const PullRequestFileSchema = new mongoose.Schema(
  {
    project: ObjectId,
    pullRequest: ObjectId,
    data: RequiredObject, // Response of github API
    base: Object, // Basic data extracted
  },
  { timestamps: true }
);
PullRequestFileSchema.index({ "data.sha": -1 }, { name: "identifier" });

const PullRequestCommentSchema = new mongoose.Schema(
  {
    project: ObjectId,
    pullRequest: ObjectId,
    data: RequiredObject, // Response of github API
  },
  { timestamps: true }
);
PullRequestCommentSchema.index({ "data.user.login": -1 }, { expires: "2m" });

const FollowCheckSchema = new mongoose.Schema(
  {
    project: ObjectId,
    pullRequest: ObjectId,
    requesterLogin: RequiredString,
    mergerLogin: RequiredString,
    following: RequiredBoolean,
    sameAsMerger: RequiredBoolean,
  },
  { timestamps: true }
);

const PullRequestRequesterSchema = new mongoose.Schema(
  {
    project: ObjectId,
    requesterLogin: RequiredString,
    data: RequiredObject, // Response of github API
  },
  { timestamps: true }
);

const models = {
  control: mongoose.model("Control", ControlSchema),
  followCheck: mongoose.model("FollowCheck", FollowCheckSchema),
  project: mongoose.model("Project", ProjectSchema),
  issue: mongoose.model("Issue", IssueSchema),
  issueComment: mongoose.model("IssueComment", IssueCommentSchema),
  pullRequest: mongoose.model("PullRequest", PullRequestSchema),
  pullRequestFile: mongoose.model("PullRequestFile", PullRequestFileSchema),
  pullRequestComment: mongoose.model(
    "PullRequestComment",
    PullRequestCommentSchema
  ),
  pullRequestRequester: mongoose.model(
    "PullRequestRequester",
    PullRequestRequesterSchema
  ),
};

module.exports = {
  connect() {
    return mongoose.connect(config.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
  },
  disconnect() {
    return mongoose.disconnect();
  },
  async clear() {
    const values = Object.values(models);
    await Promise.all(values.map((model) => model.deleteMany({})));
  },
  models,
  toId(id) {
    return mongoose.Types.ObjectId(id);
  },
};
