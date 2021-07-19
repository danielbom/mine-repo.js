async function catchSafeErrors(err) {
  if (err.isAxiosError) {
    switch (err.response.status) {
      case 404:
        return err.response;
    }
  }
  throw err;
}

module.exports = catchSafeErrors;
