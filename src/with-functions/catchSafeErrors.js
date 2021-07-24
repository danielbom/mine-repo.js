function catchSafeErrors(err) {
  if (err.isAxiosError && err.response) {
    switch (err.response.status) {
      case 404:
        return err.response;
    }
  }
  throw err;
}

module.exports = catchSafeErrors;
