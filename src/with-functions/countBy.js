function countBy(xs, pred) {
  return xs.reduce((acc, x) => (pred(x) ? acc + 1 : acc), 0);
}

module.exports = countBy;
