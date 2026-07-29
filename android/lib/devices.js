// BrowserStack device matrix. Confirm names/versions in App Automate before use.
const DEVICES = Object.freeze([
  Object.freeze({
    id: "android-16-0-google-pixel-10",
    device: "Google Pixel 10",
    osVersion: "16.0",
  }),
  Object.freeze({
    id: "android-15-0-google-pixel-9",
    device: "Google Pixel 9",
    osVersion: "15.0",
  }),
]);

module.exports = { DEVICES };
