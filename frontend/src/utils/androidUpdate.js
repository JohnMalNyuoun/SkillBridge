const RELEASES_URL = 'https://api.github.com/repos/JohnMalNyuoun/SkillBridge/releases/latest';
const RELEASE_DOWNLOAD_PREFIX = '/JohnMalNyuoun/SkillBridge/releases/download/';

const parseVersion = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/^v/i, '');
  if (!/^\d+(?:\.\d+){1,3}$/.test(normalized)) return null;
  return normalized.split('.').map((part) => Number(part));
};

export const compareAndroidVersions = (left, right) => {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  if (!leftParts || !rightParts) return null;

  for (let index = 0; index < 4; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
};

const isOfficialApkUrl = (value, tagName) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:'
      && url.hostname === 'github.com'
      && !url.username
      && !url.password
      && url.pathname.startsWith(`${RELEASE_DOWNLOAD_PREFIX}${encodeURIComponent(tagName)}/`)
      && url.pathname.toLowerCase().endsWith('.apk')
    );
  } catch {
    return false;
  }
};

export const findAndroidUpdate = async (currentVersion, fetchImpl = fetch) => {
  if (!parseVersion(currentVersion)) {
    throw new Error('The installed Android version is not a supported numeric version.');
  }

  const response = await fetchImpl(RELEASES_URL, {
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub Releases returned HTTP ${response.status}.`);
  }

  const release = await response.json();
  const comparison = compareAndroidVersions(release?.tag_name, currentVersion);
  if (
    release?.draft
    || release?.prerelease
    || comparison === null
    || comparison <= 0
  ) {
    return null;
  }

  const apkAssets = Array.isArray(release.assets)
    ? release.assets.filter((asset) => typeof asset?.name === 'string' && /\.apk$/i.test(asset.name))
    : [];
  if (apkAssets.length === 0) return null;
  if (apkAssets.length !== 1 || !isOfficialApkUrl(apkAssets[0].browser_download_url, release.tag_name)) {
    throw new Error('The latest GitHub release does not contain one trusted SkillBridge APK.');
  }

  return {
    version: release.tag_name.replace(/^v/i, ''),
    downloadUrl: apkAssets[0].browser_download_url
  };
};
