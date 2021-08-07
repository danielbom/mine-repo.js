const Promise = require("bluebird");

async function computePaginated({ getPaginated, mapper, concurrency }) {
  let page = 0;
  while (true) {
    const items = await getPaginated({ page });
    if (items.length === 0) break;

    await Promise.map(items, mapper, { concurrency });
    page++;
  }
}

module.exports = computePaginated;
