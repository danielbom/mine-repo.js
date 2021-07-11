async function loadProject({
  storeProject,
  findProject,
  projectOwner,
  projectName,
}) {
  const project = await findProject({ projectOwner, projectName });
  if (!project) return storeProject({ projectOwner, projectName });
  return project;
}

module.exports = loadProject;
