const promiseConcurrency = require("promise-concurrency");

async function computePaginated({ getPaginated, mapper, concurrency }) {
  let page = 0;
  while (true) {
    const items = await getPaginated({ page });
    if (items.length === 0) break;

    await promiseConcurrency(
      items.map((item) => () => mapper(item)),
      concurrency
    );
    page++;
  }
}

module.exports = computePaginated;
