function catch7stepSafeError(err) {
  if (err.isAxiosError && err.response) {
    switch (err.response.status) {
      case 503:
      case 422:
        return {};
    }
  }
  throw err;
}

module.exports = catch7stepSafeError;
