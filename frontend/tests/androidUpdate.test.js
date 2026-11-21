import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareAndroidVersions,
  findAndroidUpdate
} from '../src/utils/androidUpdate.js';

const makeResponse = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  async json() {
    return body;
  }
});

test('compares Android version names numerically with optional v-prefixes', () => {
  assert.equal(compareAndroidVersions('v1.10.0', '1.9'), 1);
  assert.equal(compareAndroidVersions('1.0', 'v1.0.0'), 0);
  assert.equal(compareAndroidVersions('1.0.1', '1.0.2'), -1);
  assert.equal(compareAndroidVersions('latest', '1.0'), null);
});

test('returns only a newer APK hosted by this repository GitHub Releases path', async () => {
  const release = {
    tag_name: 'v1.1.0',
    draft: false,
    prerelease: false,
    assets: [{
      name: 'SkillBridge.apk',
      browser_download_url: 'https://github.com/JohnMalNyuoun/SkillBridge/releases/download/v1.1.0/SkillBridge.apk'
    }]
  };
  const update = await findAndroidUpdate('1.0', async () => makeResponse(200, release));

  assert.deepEqual(update, {
    version: '1.1.0',
    downloadUrl: release.assets[0].browser_download_url
  });
});

test('ignores a missing release and rejects APK links outside the official repository', async () => {
  assert.equal(await findAndroidUpdate('1.0', async () => makeResponse(404, {})), null);

  await assert.rejects(
    findAndroidUpdate('1.0', async () => makeResponse(200, {
      tag_name: 'v1.1.0',
      assets: [{
        name: 'SkillBridge.apk',
        browser_download_url: 'https://example.com/SkillBridge.apk'
      }]
    })),
    /trusted SkillBridge APK/
  );
});
