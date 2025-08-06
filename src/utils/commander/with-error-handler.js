function withErrorHandler(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      log.error(err.message || err);
      process.exit(1);
    }
  };
}

export { withErrorHandler }
