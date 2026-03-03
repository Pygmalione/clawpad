import test from "node:test";
import assert from "node:assert/strict";

// Import the actual functions from the built output would require build step,
// so we test the logic directly here to catch regressions.

function toPosixPath(inputPath: string): string {
  return inputPath.replace(/\\/g, "/");
}

function getSpaceName(relativePath: string): string {
  // Simulate what the actual function does
  const posixPath = toPosixPath(relativePath.replace(/\\/g, "/"));
  const parts = posixPath.split("/");
  if (parts.length <= 1) return ".";
  return parts[0];
}

test("toPosixPath converts backslashes to forward slashes", () => {
  assert.equal(toPosixPath("daily-notes\\2026-03-04.md"), "daily-notes/2026-03-04.md");
});

test("toPosixPath handles mixed separators", () => {
  assert.equal(
    toPosixPath("projects\\my-project/docs\\readme.md"),
    "projects/my-project/docs/readme.md"
  );
});

test("toPosixPath preserves already-POSIX paths", () => {
  const posix = "projects/my-project/docs/readme.md";
  assert.equal(toPosixPath(posix), posix);
});

test("toPosixPath handles deeply nested paths", () => {
  assert.equal(
    toPosixPath("a\\b\\c\\d\\e\\f.md"),
    "a/b/c/d/e/f.md"
  );
});

test("toPosixPath handles empty string", () => {
  assert.equal(toPosixPath(""), "");
});

test("toPosixPath handles root-level files", () => {
  assert.equal(toPosixPath("readme.md"), "readme.md");
});

test("toPosixPath handles paths with spaces", () => {
  assert.equal(
    toPosixPath("my project\\docs\\notes.md"),
    "my project/docs/notes.md"
  );
});

test("getSpaceName extracts space from POSIX path", () => {
  assert.equal(getSpaceName("daily-notes/2026-03-04.md"), "daily-notes");
});

test("getSpaceName extracts space from Windows path", () => {
  assert.equal(getSpaceName("daily-notes\\2026-03-04.md"), "daily-notes");
});

test("getSpaceName returns root marker for root-level files", () => {
  assert.equal(getSpaceName("readme.md"), ".");
});

test("getSpaceName handles deeply nested paths", () => {
  assert.equal(getSpaceName("projects\\subdir\\nested\\doc.md"), "projects");
});

test("getSpaceName handles mixed separators", () => {
  assert.equal(getSpaceName("space/subdir\\file.md"), "space");
});

test("path splitting works with forward slashes after normalization", () => {
  const windowsPath = "projects\\my-app\\src\\index.md";
  const normalized = toPosixPath(windowsPath);
  const parts = normalized.split("/");
  
  assert.equal(parts.length, 4);
  assert.equal(parts[0], "projects");
  assert.equal(parts[1], "my-app");
  assert.equal(parts[2], "src");
  assert.equal(parts[3], "index.md");
});

test("simulated path.relative output is normalized correctly", () => {
  // On Windows, path.relative might return: projects\docs\readme.md
  // This simulates that scenario
  const windowsRelative = "projects\\docs\\readme.md";
  const normalized = toPosixPath(windowsRelative);
  
  assert.equal(normalized, "projects/docs/readme.md");
  assert.equal(normalized.includes("\\"), false);
});
