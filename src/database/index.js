const config = require("../config");

const mongoose = require("mongoose");

const ObjectId = { type: mongoose.Types.ObjectId, required: true };
const RequiredString = { type: String, required: true };
const RequiredBoolean = { type: Boolean, required: true };

const ProjectSchema = new mongoose.Schema(
  {
    projectName: RequiredString,
    projectOwner: RequiredString,
    data: Object, // Response of github API
    base: Object, // Basic data extracted
    languages: Object, // Response of github API
    pullsCollected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PullRequestSchema = new mongoose.Schema(
  {
    project: ObjectId,
    data: Object, // Response of github API
    selfData: Object, // Response of github API
    base: Object, // Basic data extracted
    filesCollected: { type: Boolean, default: false },
    individualPrCollected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PullRequestFileSchema = new mongoose.Schema(
  {
    project: ObjectId,
    pullRequest: ObjectId,
    data: Object, // Response of github API
    base: Object, // Basic data extracted
  },
  { timestamps: true }
);

const FollowCheckSchema = new mongoose.Schema(
  {
    project: ObjectId,
    pullRequest: ObjectId,
    requesterLogin: RequiredString,
    mergerLogin: RequiredString,
    following: RequiredBoolean,
    sameAsMerger: RequiredBoolean,
    data: Object, // requesterLogin data: Response of github API
  },
  { timestamps: true }
);

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
  models: {
    followCheck: mongoose.model("FollowCheck", FollowCheckSchema),
    project: mongoose.model("Project", ProjectSchema),
    pullRequest: mongoose.model("PullRequest", PullRequestSchema),
    pullRequestFile: mongoose.model("PullRequestFile", PullRequestFileSchema),
  },
  toId(id) {
    return mongoose.Types.ObjectId(id);
  },
};
