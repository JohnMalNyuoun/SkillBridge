import { expect, test } from '@playwright/test';
import {
  isBuildBundlePrecached,
  isOnlyWindowClient
} from '../src/pwaUpdatePolicy.js';

test('only recognizes the current app bundle in the worker precache', () => {
  const manifest = [
    { url: 'assets/index-current.js', revision: null },
    'assets/app-current.css'
  ];

  expect(isBuildBundlePrecached(
    '/assets/index-current.js',
    manifest,
    'https://skillbridge.example/sw.js'
  )).toBe(true);
  expect(isBuildBundlePrecached(
    '/assets/index-outdated.js',
    manifest,
    'https://skillbridge.example/sw.js'
  )).toBe(false);
  expect(isBuildBundlePrecached(
    'https://other.example/assets/index-current.js',
    manifest,
    'https://skillbridge.example/sw.js'
  )).toBe(false);
});

test('activation is safe only when the requesting page is the sole window client', () => {
  expect(isOnlyWindowClient([{ id: 'current' }], 'current')).toBe(true);
  expect(isOnlyWindowClient([{ id: 'current' }, { id: 'another' }], 'current')).toBe(false);
  expect(isOnlyWindowClient([{ id: 'another' }], 'current')).toBe(false);
});
