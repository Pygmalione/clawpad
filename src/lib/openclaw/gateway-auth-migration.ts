import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { findOpenClawConfigPath } from "./config";
import { parseOpenClawConfig } from "./parse";

type JsonObject = Record<string, unknown>;

function normalizeToken(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeScopeSet(raw: unknown): Set<string> {
  const scopes = new Set<string>();
  const parts: string[] = [];

  if (typeof raw === "string") {
    parts.push(...raw.split(/[,\s]+/g));
  } else if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        parts.push(...item.split(/[,\s]+/g));
      }
    }
  }

  for (const part of parts) {
    const normalized = part.trim().toLowerCase();
    if (normalized) scopes.add(normalized);
  }

  return scopes;
}

function extractTokenFromEntry(entry: unknown): string | undefined {
  if (typeof entry === "string") {
    return normalizeToken(entry);
  }
  if (!entry || typeof entry !== "object") {
    return undefined;
  }
  const record = entry as JsonObject;
  if (record.enabled === false) {
    return undefined;
  }
  return normalizeToken(
    record.token ??
      record.value ??
      record.accessToken ??
      record.access_token ??
      record.bearer ??
      record.secret,
  );
}

type NormalizedTokenEntry = {
  token: string;
  score: number;
  priority: number;
};

function scoreScopes(scopes: Set<string>): number {
  let score = 10;
  if (scopes.has("operator.read")) score += 100;
  if (scopes.has("operator.write")) score += 200;
  if (scopes.has("operator.admin")) score += 30;
  if (scopes.has("operator.approvals")) score += 5;
  if (scopes.has("operator.pairing")) score += 5;
  return score;
}

function normalizeTokenEntry(entry: unknown, priority: number): NormalizedTokenEntry | null {
  const token = extractTokenFromEntry(entry);
  if (!token) return null;

  const scopeSet =
    entry && typeof entry === "object"
      ? normalizeScopeSet(
          (entry as JsonObject).scopes ?? (entry as JsonObject).scope,
        )
      : new Set<string>();

  return {
    token,
    score: scoreScopes(scopeSet),
    priority,
  };
}

function resolveCommand(command: string): string {
  if (process.platform !== "win32") return command;
  return command.endsWith(".cmd") ? command : `${command}.cmd`;
}

function hasOpenClawCli(): boolean {
  const result = spawnSync(resolveCommand("openclaw"), ["--version"], {
    stdio: "ignore",
    timeout: 1_500,
    shell: false,
    windowsHide: true,
  });
  return !result.error && result.status === 0;
}

function scheduleGatewayRestartBestEffort(): boolean {
  if (!hasOpenClawCli()) {
    return false;
  }

  const candidates = [
    ["openclaw", "gateway", "restart"],
    ["openclaw", "daemon", "restart"],
  ];

  for (const candidate of candidates) {
    const [command, ...args] = candidate;
    try {
      const child = spawn(resolveCommand(command), args, {
        stdio: "ignore",
        detached: true,
        shell: false,
        windowsHide: true,
      });
      child.unref();
      return true;
    } catch {
      // Try fallback command
    }
  }

  return false;
}

function asJsonObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" ? (value as JsonObject) : null;
}

/**
 * Repair unsupported gateway.auth.tokens entries by collapsing them back into
 * gateway.auth.token (OpenClaw 2026.3+ schema).
 */
export async function migrateLegacyGatewayAuthConfigIfNeeded(): Promise<{
  updated: boolean;
  restarted: boolean;
  configPath: string | null;
}> {
  if (process.env.CLAWPAD_SKIP_GATEWAY_AUTH_MIGRATION === "1") {
    return { updated: false, restarted: false, configPath: null };
  }

  const configPath = findOpenClawConfigPath();
  if (!configPath) {
    return { updated: false, restarted: false, configPath: null };
  }

  let raw = "";
  try {
    raw = await fs.readFile(configPath, "utf-8");
  } catch {
    return { updated: false, restarted: false, configPath };
  }

  const parsed = parseOpenClawConfig(raw);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") {
    return { updated: false, restarted: false, configPath };
  }

  const config = parsed.value as JsonObject;
  const gateway = asJsonObject(config.gateway);
  const auth = asJsonObject(gateway?.auth);
  if (!gateway || !auth) {
    return { updated: false, restarted: false, configPath };
  }

  if (!Array.isArray(auth.tokens)) {
    return { updated: false, restarted: false, configPath };
  }

  const tokenEntries = auth.tokens
    .map((entry, index) => normalizeTokenEntry(entry, index))
    .filter((entry): entry is NormalizedTokenEntry => Boolean(entry));
  tokenEntries.sort((a, b) => b.score - a.score || a.priority - b.priority);

  const selectedToken = normalizeToken(auth.token) ?? tokenEntries[0]?.token;
  if (selectedToken) {
    auth.token = selectedToken;
  }
  delete auth.tokens;
  delete auth.scope;
  delete auth.scopes;

  try {
    await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  } catch {
    return { updated: false, restarted: false, configPath };
  }

  const restarted = scheduleGatewayRestartBestEffort();
  return { updated: true, restarted, configPath };
}
