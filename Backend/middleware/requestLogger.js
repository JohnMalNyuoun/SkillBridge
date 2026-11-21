const SENSITIVE_FIELD = /(authorization|cookie|password|token|secret|credential|api[-_]?key)/i;

const sanitizeSensitiveFields = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeSensitiveFields);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    SENSITIVE_FIELD.test(key) ? '[redacted]' : sanitizeSensitiveFields(item)
  ]));
};

const sanitizeHeaders = (headers = {}) => sanitizeSensitiveFields(headers);

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
      url: req.path,
      ip: req.ip || req.socket?.remoteAddress || 'unknown',
      query: sanitizeSensitiveFields(req.query || {}),
      headers: sanitizeHeaders(req.headers),
      body: req.path.startsWith('/api/auth/')
        ? '[redacted authentication payload]'
        : sanitizeSensitiveFields(req.body || {})
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
module.exports.sanitizeSensitiveFields = sanitizeSensitiveFields;
