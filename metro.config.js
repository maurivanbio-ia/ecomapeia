const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const config = getDefaultConfig(__dirname);

// Escape special regex chars in a path string for use in RegExp
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Explicitly build a watchFolders list that includes only the
// source directories we care about, excluding transient system dirs
// like .local (which contains temp skill files that get created/deleted).
const sourceDirs = ["client", "server", "shared", "assets", "scripts"];
const extraWatchFolders = sourceDirs
  .map((d) => path.join(__dirname, d))
  .filter((d) => fs.existsSync(d));

// Metro watches the project root by default. We add our source dirs
// explicitly AND block everything under .local and .git to avoid ENOENT
// crashes when those temp dirs are cleaned up by the environment.
config.watchFolders = [__dirname, ...extraWatchFolders];

config.resolver = {
  ...config.resolver,
  blockList: [
    // Block .local (temp skill files get deleted, crashing Metro's watcher)
    new RegExp("^" + escapeRegex(path.join(__dirname, ".local")) + "(/|$)"),
    // Block .git
    new RegExp("^" + escapeRegex(path.join(__dirname, ".git")) + "(/|$)"),
  ],
};

module.exports = config;
