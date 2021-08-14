function ignoreWith(ignoredFields) {
  return function cleaner(data) {
    const copy = {};
    for (const key in data) {
      if (!ignoredFields[key]) {
        copy[key] = data[key];
      }
    }
    return copy;
  };
}

module.exports = ignoreWith;
