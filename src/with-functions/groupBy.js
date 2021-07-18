function groupBy(array, keyGetter) {
  return array.reduce((dict, item) => {
    const key = keyGetter(item);
    dict[key] = item;
    return dict;
  }, {});
}

module.exports = groupBy;
