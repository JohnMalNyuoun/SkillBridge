const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://skillbridge-tu5k.onrender.com',
  'https://localhost'
];

const getAllowedOrigins = ({
  frontendUrl = process.env.FRONTEND_URL,
  corsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS
} = {}) => {
  const configuredOrigins = [
    ...(frontendUrl || '').split(','),
    ...(corsAllowedOrigins || '').split(',')
  ]
    .map((origin) => origin.trim())
    .map((origin) => origin.replace(/\/+$/, ''))
    .filter(Boolean);

  if (configuredOrigins.some((origin) => origin.includes('*'))) {
    throw new Error('CORS origins must be explicit when credentials are enabled.');
  }

  const origins = [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...configuredOrigins
  ];

  return [...new Set(origins)];
};

module.exports = { getAllowedOrigins };
