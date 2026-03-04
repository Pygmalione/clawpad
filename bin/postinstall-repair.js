#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");

function isGlobalInstall() {
  return (
    process.env.npm_config_global === "true" ||
    process.env.npm_config_location === "global"
  );
}

function isManagedClawpadLinkTarget(targetPath) {
  const normalized = String(targetPath || "").replace(/\\/g, "/");
  return normalized.includes("/node_modules/clawpad/bin/clawpad.js");
}

function repairLocalBinSymlink() {
  const binTarget = path.resolve(__dirname, "clawpad.js");
  if (!fs.existsSync(binTarget)) return;

  const localBinDir = path.join(os.homedir(), ".local", "bin");
  const launcherLink = path.join(localBinDir, "clawpad");

  try {
    fs.mkdirSync(localBinDir, { recursive: true });
  } catch {
    return;
  }

  let stat = null;
  try {
    stat = fs.lstatSync(launcherLink);
  } catch {
    stat = null;
  }

  if (!stat) {
    try {
      fs.symlinkSync(binTarget, launcherLink);
      console.log(`clawpad: linked ${launcherLink} -> ${binTarget}`);
    } catch {
      // ignore
    }
    return;
  }

  if (!stat.isSymbolicLink()) {
    return;
  }

  let currentTarget;
  try {
    currentTarget = path.resolve(path.dirname(launcherLink), fs.readlinkSync(launcherLink));
  } catch {
    return;
  }

  if (currentTarget === binTarget) return;
  if (!isManagedClawpadLinkTarget(currentTarget)) return;

  try {
    fs.unlinkSync(launcherLink);
    fs.symlinkSync(binTarget, launcherLink);
    console.log(`clawpad: updated ${launcherLink} -> ${binTarget}`);
  } catch {
    // ignore
  }
}

function main() {
  if (process.env.CLAWPAD_SKIP_POSTINSTALL_REPAIR === "1") return;
  if (!isGlobalInstall()) return;
  if (process.platform === "win32") return;
  repairLocalBinSymlink();
}

main();
