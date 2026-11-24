// Expo's defaults, plus one fix: three's CommonJS entry (three.cjs, used when a library `require`s three,
// as React Three Fiber's native build does) calls `process.emitWarning`, which React Native lacks, and
// crashes the editor on phones. Always load three's ES module build instead.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
// three's exports hide its files from require.resolve; its CommonJS entry sits next to the ES module.
const threeModule = path.join(path.dirname(require.resolve("three")), "three.module.js");

config.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === "three" ? { type: "sourceFile", filePath: threeModule } : context.resolveRequest(context, moduleName, platform);

module.exports = config;
