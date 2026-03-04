module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: [
      // Reanimated must be last; nativewind/babel not needed in v4 (handled by jsxImportSource)
      "react-native-reanimated/plugin",
    ],
  };
};
