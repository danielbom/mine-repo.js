function ignoreWith(ignoredFields) {
  function cleaner(data) {
    const copy = {};
    for (const key in data) {
      if (!ignoredFields[key]) {
        copy[key] = data[key];
      }
    }
    return copy;
  }

  cleaner.ignoredFields = ignoredFields;
  return cleaner;
}

module.exports = ignoreWith;
