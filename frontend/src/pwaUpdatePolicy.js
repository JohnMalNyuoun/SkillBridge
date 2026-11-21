export const isBuildBundlePrecached = (bundlePath, manifest, workerUrl) => {
  if (typeof bundlePath !== 'string' || !Array.isArray(manifest)) return false;

  try {
    const workerOrigin = new URL(workerUrl).origin;
    const currentBundle = new URL(bundlePath, workerUrl);
    if (
      currentBundle.origin !== workerOrigin
      || !currentBundle.pathname.startsWith('/assets/')
    ) {
      return false;
    }

    return manifest.some((entry) => {
      const entryUrl = typeof entry === 'string' ? entry : entry?.url;
      if (typeof entryUrl !== 'string') return false;

      const precachedUrl = new URL(entryUrl, workerUrl);
      return (
        precachedUrl.origin === workerOrigin
        && precachedUrl.pathname === currentBundle.pathname
      );
    });
  } catch {
    return false;
  }
};

export const isOnlyWindowClient = (clients, sourceClientId) => (
  Array.isArray(clients)
  && clients.length === 1
  && clients[0]?.id === sourceClientId
);
