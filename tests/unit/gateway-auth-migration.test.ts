import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { migrateLegacyGatewayAuthConfigIfNeeded } from "@/lib/openclaw/gateway-auth-migration";

function restoreEnvVar(name: string, previous: string | undefined): void {
  if (previous === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = previous;
}

test("migrateLegacyGatewayAuthConfigIfNeeded repairs unsupported gateway.auth.tokens", async () => {
  const prevConfigPath = process.env.OPENCLAW_CONFIG_PATH;
  const prevStateDir = process.env.OPENCLAW_STATE_DIR;
  const prevSkipMigration = process.env.CLAWPAD_SKIP_GATEWAY_AUTH_MIGRATION;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "clawpad-auth-migration-"));
  const configPath = path.join(tempDir, "openclaw.json");

  await fs.writeFile(
    configPath,
    JSON.stringify({
      gateway: {
        auth: {
          tokens: [
            { token: "token-read", scopes: ["operator.read"] },
            { token: "token-write", scopes: ["operator.write"] },
          ],
        },
      },
    }),
    "utf8",
  );

  process.env.OPENCLAW_CONFIG_PATH = configPath;
  delete process.env.OPENCLAW_STATE_DIR;
  delete process.env.CLAWPAD_SKIP_GATEWAY_AUTH_MIGRATION;

  try {
    const result = await migrateLegacyGatewayAuthConfigIfNeeded();
    assert.equal(result.updated, true);

    const migratedRaw = await fs.readFile(configPath, "utf8");
    const migrated = JSON.parse(migratedRaw) as {
      gateway?: {
        auth?: {
          token?: string;
          tokens?: Array<{ token?: string; scopes?: string[] }>;
        };
      };
    };

    const auth = migrated.gateway?.auth;
    assert.ok(auth);
    assert.equal(auth?.token, "token-write");
    assert.equal(Array.isArray(auth?.tokens), false);

    const second = await migrateLegacyGatewayAuthConfigIfNeeded();
    assert.equal(second.updated, false);
  } finally {
    restoreEnvVar("OPENCLAW_CONFIG_PATH", prevConfigPath);
    restoreEnvVar("OPENCLAW_STATE_DIR", prevStateDir);
    restoreEnvVar("CLAWPAD_SKIP_GATEWAY_AUTH_MIGRATION", prevSkipMigration);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("migrateLegacyGatewayAuthConfigIfNeeded is a no-op for already-valid auth config", async () => {
  const prevConfigPath = process.env.OPENCLAW_CONFIG_PATH;
  const prevStateDir = process.env.OPENCLAW_STATE_DIR;
  const prevSkipMigration = process.env.CLAWPAD_SKIP_GATEWAY_AUTH_MIGRATION;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "clawpad-auth-migration-noop-"));
  const configPath = path.join(tempDir, "openclaw.json");

  await fs.writeFile(
    configPath,
    JSON.stringify({
      gateway: {
        auth: {
          token: "scoped-token",
        },
      },
    }),
    "utf8",
  );

  process.env.OPENCLAW_CONFIG_PATH = configPath;
  delete process.env.OPENCLAW_STATE_DIR;
  delete process.env.CLAWPAD_SKIP_GATEWAY_AUTH_MIGRATION;

  try {
    const result = await migrateLegacyGatewayAuthConfigIfNeeded();
    assert.equal(result.updated, false);
  } finally {
    restoreEnvVar("OPENCLAW_CONFIG_PATH", prevConfigPath);
    restoreEnvVar("OPENCLAW_STATE_DIR", prevStateDir);
    restoreEnvVar("CLAWPAD_SKIP_GATEWAY_AUTH_MIGRATION", prevSkipMigration);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
