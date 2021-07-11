async function fetchProjectData({ fetchProject, projectOwner, projectName }) {
  const response = await fetchProject({ projectOwner, projectName });
  return response.data;
}

module.exports = fetchProjectData;
