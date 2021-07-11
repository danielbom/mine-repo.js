module.exports = (data) => {
  if (Array.isArray(data)) return data.length;
  return 0;
};
