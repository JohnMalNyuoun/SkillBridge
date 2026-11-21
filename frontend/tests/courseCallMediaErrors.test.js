import assert from 'node:assert/strict';
import test from 'node:test';
import { getCourseCallMediaErrorMessage } from '../src/utils/courseCallMediaErrors.js';

test('media error messages identify missing devices for the selected call mode', () => {
  assert.match(
    getCourseCallMediaErrorMessage('NotFoundError', 'audio'),
    /No microphone was found/
  );
  assert.match(
    getCourseCallMediaErrorMessage('NotFoundError', 'video'),
    /microphone or camera/
  );
});

test('permission, device-busy, constraint, and security errors get actionable messages', () => {
  assert.match(getCourseCallMediaErrorMessage('NotAllowedError', 'audio'), /access.*denied/i);
  assert.match(getCourseCallMediaErrorMessage('NotReadableError', 'video'), /unavailable|another app/i);
  assert.match(getCourseCallMediaErrorMessage('OverconstrainedError', 'video'), /cannot meet/i);
  assert.match(getCourseCallMediaErrorMessage('SecurityError', 'audio'), /secure connection/i);
});

test('unknown media errors do not expose the browser error message', () => {
  assert.match(getCourseCallMediaErrorMessage('UnknownError', 'audio'), /Check your permissions/);
});
