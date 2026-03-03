#!/usr/bin/env node
/**
 * Test script for Windows path handling.
 * Verifies that path normalization works correctly on Windows.
 * 
 * Run with: node scripts/test-windows-paths.js
 */

const path = require('path');
const assert = require('assert');

// Simulate the toPosixPath function
function toPosixPath(inputPath) {
  return inputPath.replace(/\\/g, '/');
}

console.log('Testing Windows path handling...\n');
console.log(`Platform: ${process.platform}`);
console.log(`Path separator: "${path.sep}"\n`);

// Test 1: Basic backslash conversion
console.log('Test 1: Basic backslash conversion');
const windowsPath = 'daily-notes\\2026-03-04.md';
const posixPath = toPosixPath(windowsPath);
assert.strictEqual(posixPath, 'daily-notes/2026-03-04.md');
console.log(`  ✓ "${windowsPath}" → "${posixPath}"\n`);

// Test 2: Mixed separators
console.log('Test 2: Mixed separators');
const mixedPath = 'projects\\my-project/docs\\readme.md';
const normalizedMixed = toPosixPath(mixedPath);
assert.strictEqual(normalizedMixed, 'projects/my-project/docs/readme.md');
console.log(`  ✓ "${mixedPath}" → "${normalizedMixed}"\n`);

// Test 3: Already POSIX path (no change)
console.log('Test 3: Already POSIX path');
const alreadyPosix = 'projects/my-project/docs/readme.md';
const unchanged = toPosixPath(alreadyPosix);
assert.strictEqual(unchanged, alreadyPosix);
console.log(`  ✓ "${alreadyPosix}" → "${unchanged}"\n`);

// Test 4: path.join on this platform
console.log('Test 4: path.join normalization');
const joined = path.join('daily-notes', '2026-03-04.md');
const joinedNormalized = toPosixPath(joined);
assert.strictEqual(joinedNormalized, 'daily-notes/2026-03-04.md');
console.log(`  ✓ path.join result: "${joined}"`);
console.log(`  ✓ Normalized: "${joinedNormalized}"\n`);

// Test 5: path.relative on this platform
console.log('Test 5: path.relative normalization');
const base = path.join('C:', 'Users', 'test', 'pages');
const full = path.join(base, 'projects', 'doc.md');
const relative = path.relative(base, full);
const relativeNormalized = toPosixPath(relative);
assert.strictEqual(relativeNormalized, 'projects/doc.md');
console.log(`  ✓ Base: "${base}"`);
console.log(`  ✓ Full: "${full}"`);
console.log(`  ✓ Relative: "${relative}"`);
console.log(`  ✓ Normalized: "${relativeNormalized}"\n`);

// Test 6: Space extraction from path
console.log('Test 6: Space extraction');
function getSpaceName(relativePath) {
  const posixPath = toPosixPath(path.normalize(relativePath));
  const parts = posixPath.split('/');
  if (parts.length <= 1) return '.';
  return parts[0];
}
const pathWithSpace = 'daily-notes\\2026\\03\\04.md';
const space = getSpaceName(pathWithSpace);
assert.strictEqual(space, 'daily-notes');
console.log(`  ✓ Path: "${pathWithSpace}"`);
console.log(`  ✓ Space: "${space}"\n`);

// Test 7: Deeply nested Windows path
console.log('Test 7: Deeply nested path');
const deepPath = 'space\\folder1\\folder2\\folder3\\document.md';
const deepNormalized = toPosixPath(deepPath);
assert.strictEqual(deepNormalized, 'space/folder1/folder2/folder3/document.md');
console.log(`  ✓ "${deepPath}" → "${deepNormalized}"\n`);

// Test 8: Root-level file (no directory)
console.log('Test 8: Root-level file');
const rootFile = 'readme.md';
const rootNormalized = toPosixPath(rootFile);
assert.strictEqual(rootNormalized, 'readme.md');
console.log(`  ✓ "${rootFile}" → "${rootNormalized}"\n`);

// Test 9: Path with special characters
console.log('Test 9: Path with special characters');
const specialPath = 'projects\\my project (2026)\\notes.md';
const specialNormalized = toPosixPath(specialPath);
assert.strictEqual(specialNormalized, 'projects/my project (2026)/notes.md');
console.log(`  ✓ "${specialPath}" → "${specialNormalized}"\n`);

// Test 10: Empty path
console.log('Test 10: Empty path');
const emptyPath = '';
const emptyNormalized = toPosixPath(emptyPath);
assert.strictEqual(emptyNormalized, '');
console.log(`  ✓ Empty path handled correctly\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('All path normalization tests passed! ✓');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
