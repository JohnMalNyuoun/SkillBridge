const sanitizeHeaders = (headers = {}) => {
  const copied = { ...headers };
  if (copied.authorization) {
    copied.authorization = '[redacted]';
  }
  if (copied.cookie) {
    copied.cookie = '[redacted]';
  }
  return copied;
};

const truncate = (value, maxLength = 1500) => {
  if (value == null) return value;
  let str;
  if (typeof value === 'string') {
    str = value;
  } else {
    try {
      const seen = new WeakSet();
      str = JSON.stringify(value, (key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[circular]';
          seen.add(val);
        }
        return val;
      });
    } catch (_err) {
      str = '[unserializable payload]';
    }
  }
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}... [truncated ${str.length - maxLength} chars]`;
};

const requestLogger = (req, res, next) => {
  try {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    const isApiRequest = req.originalUrl.startsWith('/api/');

    if (!isApiRequest) {
      res.on('finish', () => {
        try {
          const durationMs = Date.now() - startTime;
          console.log(`REQUEST ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
        } catch (err) {
          console.error('LOGGER ERROR (finish):', err.message);
        }
      });

      return next();
    }

    const requestInfo = {
      time: startedAt,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.socket?.remoteAddress || 'unknown',
      query: req.query || {},
      headers: sanitizeHeaders(req.headers),
      body: req.body || {}
    };

    console.log('REQUEST START');
    console.log(truncate(requestInfo));

    res.on('finish', () => {
      try {
        const durationMs = Date.now() - startTime;
        const responseInfo = {
          time: new Date().toISOString(),
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          durationMs
        };

        console.log('REQUEST END');
        console.log(truncate(responseInfo));
      } catch (err) {
        console.error('LOGGER ERROR (finish):', err.message);
      }
    });
  } catch (err) {
    console.error('LOGGER ERROR (start):', err.message);
  }

  next();
};

module.exports = requestLogger;
