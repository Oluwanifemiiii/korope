// Tailwind v4 reads this through `@config` in globals.css.
// The preset is the design handoff file, unchanged. It replaces Tailwind's default
// colours, spacing, radius, shadows and type, so only Korope tokens produce utilities.
module.exports = {
  presets: [require("./tailwind.korope.js")],
};
