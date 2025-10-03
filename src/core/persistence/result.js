const RESULT_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  EMPTY: 'empty'
};

function isResultLike(value) {
  return value && typeof value === 'object' && typeof value.type === 'string';
}

function wrap(status, { value = undefined, error: capturedError = undefined } = {}) {
  const result = {
    type: status,
    value,
    error: capturedError,
    get isSuccess() {
      return this.type === RESULT_STATUS.SUCCESS;
    },
    get isError() {
      return this.type === RESULT_STATUS.ERROR;
    },
    get isEmpty() {
      return this.type === RESULT_STATUS.EMPTY;
    },
    map(mapper) {
      if (!this.isSuccess) {
        return this;
      }
      try {
        return success(mapper(this.value));
      } catch (err) {
        return error(err);
      }
    },
    chain(mapper) {
      if (!this.isSuccess) {
        return this;
      }
      try {
        const next = mapper(this.value);
        return from(next);
      } catch (err) {
        return error(err);
      }
    },
    mapError(mapper) {
      if (!this.isError) {
        return this;
      }
      try {
        return error(mapper(this.error));
      } catch (err) {
        return error(err);
      }
    },
    tap(sideEffect) {
      if (this.isSuccess && typeof sideEffect === 'function') {
        sideEffect(this.value);
      }
      return this;
    },
    tapError(sideEffect) {
      if (this.isError && typeof sideEffect === 'function') {
        sideEffect(this.error);
      }
      return this;
    },
    orElse(fallback) {
      return this.isSuccess ? this : from(fallback(this));
    },
    getOrElse(fallbackValue) {
      return this.isSuccess ? this.value : fallbackValue;
    }
  };

  return result;
}

function success(value) {
  return wrap(RESULT_STATUS.SUCCESS, { value });
}

function empty() {
  return wrap(RESULT_STATUS.EMPTY);
}

function error(err) {
  return wrap(RESULT_STATUS.ERROR, { error: err });
}

function from(resultLike) {
  if (resultLike === undefined) {
    return error(new Error('Result mapper returned undefined'));
  }

  if (isResultLike(resultLike)) {
    if (typeof resultLike.map === 'function' && typeof resultLike.chain === 'function') {
      return resultLike;
    }
    const status = resultLike.type;
    if (status === RESULT_STATUS.SUCCESS) {
      return success(resultLike.value);
    }
    if (status === RESULT_STATUS.EMPTY) {
      return empty();
    }
    return error(resultLike.error);
  }

  return success(resultLike);
}

function tryCatch(fn) {
  try {
    return success(fn());
  } catch (err) {
    return error(err);
  }
}

export { success, error, empty, tryCatch };
