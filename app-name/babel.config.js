module.exports = function (api) {
  api.cache(true);
  // SDK 57's preset installs the Worklets transform when the package is present.
  return { presets: ['babel-preset-expo'] };
};
