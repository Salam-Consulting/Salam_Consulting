const fs = require("fs");
const path = require("path");

const expoCliBuildDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@expo",
  "cli",
  "build"
);

const expoMetroConfigBuildDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@expo",
  "metro-config",
  "build"
);

const rnCliServerApiDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@react-native-community",
  "cli-server-api"
);

function collectJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && fullPath.endsWith(".js")) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function patchFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  let patched = source;

  patched = patched.split("metro/src/").join("metro/private/");
  patched = patched.split("metro/private/").join("metro/src/");
  patched = patched.split("metro-cache/src/").join("metro-cache/private/");
  patched = patched.split("metro-cache/private/").join("metro-cache/src/");
  patched = patched.replace(
    /const sourceMapString = typeof sourceMapString_1\.default !== 'function'[\s\S]*?: sourceMapString_1\.default;/g,
    "const sourceMapStringModule = sourceMapString_1.default ?? sourceMapString_1;\nconst sourceMapString = typeof sourceMapStringModule === 'function'\n    ? sourceMapStringModule\n    : sourceMapStringModule?.sourceMapString;"
  );

  if (patched !== source) {
    fs.writeFileSync(filePath, patched, "utf8");
    return true;
  }
  return false;
}

try {
  let changedFiles = 0;

  const targets = [
    ...collectJsFiles(expoCliBuildDir),
    ...collectJsFiles(expoMetroConfigBuildDir),
  ];

  for (const filePath of targets) {
    if (patchFile(filePath)) {
      changedFiles += 1;
    }
  }

  if (!fs.existsSync(rnCliServerApiDir)) {
    fs.mkdirSync(rnCliServerApiDir, { recursive: true });
    fs.writeFileSync(
      path.join(rnCliServerApiDir, "package.json"),
      JSON.stringify(
        {
          name: "@react-native-community/cli-server-api",
          version: "0.0.0-local-shim",
          main: "index.js",
        },
        null,
        2
      ),
      "utf8"
    );
    fs.writeFileSync(
      path.join(rnCliServerApiDir, "index.js"),
      `"use strict";
const connect = require("connect");

function securityHeadersMiddleware(_req, _res, next) {
  if (typeof next === "function") next();
}

function createDevServerMiddleware() {
  const middleware = connect();
  return {
    middleware,
    messageSocketEndpoint: {
      broadcast: () => {},
    },
    eventsSocketEndpoint: {
      reportEvent: () => {},
    },
    websocketEndpoints: {},
  };
}

module.exports = {
  createDevServerMiddleware,
  securityHeadersMiddleware,
};
`,
      "utf8"
    );
    changedFiles += 1;
  }

  if (changedFiles === 0) {
    console.log("[patch-expo-cli-metro] no changes needed.");
  } else {
    console.log(`[patch-expo-cli-metro] patched ${changedFiles} file(s).`);
  }
} catch (error) {
  console.error("[patch-expo-cli-metro] failed:", error);
  process.exit(1);
}
