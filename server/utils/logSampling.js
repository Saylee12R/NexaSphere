const LOG_SAMPLING_RATE = parseInt(process.env.LOG_SAMPLING_RATE, 10) || 100;
const ERROR_LOG_SAMPLING_RATE = parseInt(process.env.ERROR_LOG_SAMPLING_RATE, 10) || 100;
const SLOW_QUERY_LOG_SAMPLING_RATE = parseInt(process.env.SLOW_QUERY_LOG_SAMPLING_RATE, 10) || 100;
const SLOW_REQUEST_LOG_SAMPLING_RATE =
  parseInt(process.env.SLOW_REQUEST_LOG_SAMPLING_RATE, 10) || 100;

let requestCounter = 0;

export function shouldSampleLog(level, meta = {}) {
  const samplingRates = {
    error: ERROR_LOG_SAMPLING_RATE,
    warn: 100,
    info: LOG_SAMPLING_RATE,
    http: LOG_SAMPLING_RATE,
    debug: LOG_SAMPLING_RATE,
  };

  if (level === 'error') {
    return Math.random() * 100 < (samplingRates.error || 100);
  }

  if (meta.isSlowQuery) {
    return Math.random() * 100 < SLOW_QUERY_LOG_SAMPLING_RATE;
  }

  if (meta.isSlowRequest) {
    return Math.random() * 100 < SLOW_REQUEST_LOG_SAMPLING_RATE;
  }

  const rate = samplingRates[level] || LOG_SAMPLING_RATE;
  return Math.random() * 100 < rate;
}

export function createSamplingTransform(options = {}) {
  const { samplingRate = LOG_SAMPLING_RATE, errorSamplingRate = ERROR_LOG_SAMPLING_RATE } = options;

  return {
    transform(info) {
      if (info.level === 'error' || info.level === 'fatal') {
        if (Math.random() * 100 >= errorSamplingRate) {
          return false;
        }
      } else {
        if (Math.random() * 100 >= samplingRate) {
          return false;
        }
      }
      return info;
    },
  };
}

export function incrementRequestCounter() {
  requestCounter++;
}

export function getRequestCounter() {
  return requestCounter;
}

export function resetRequestCounter() {
  requestCounter = 0;
}
