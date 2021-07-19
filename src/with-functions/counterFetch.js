let counter = 0;

module.exports = {
  get() {
    counter++;
    return counter;
  },
};
