import fs from "node:fs";
import path from "node:path";

// HANDLEBARS CONTEXT
// ------------------------------------------------------------
// Variables available to every template. Returns a function so the
// JSON files are read again on each render: edits show up without
// restarting the dev server.

// Stamped once when the config loads, so every page of a build agrees.
const BUILT_AT = new Date();

// How wide an image is drawn, so the browser can pick from its srcset
// before any CSS is parsed. Mirrors --layout-max-width (75rem = 750px)
// minus the 20px body padding on each side. Keep in sync with _base.scss.
const IMAGE_SIZES = "(min-width: 790px) 750px, calc(100vw - 40px)";

// Reads <dataDir>/<name>.json into a JS value.
function readJson(dataDir, name) {
    const file = path.join(dataDir, `${name}.json`);
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

export default function handlebarsContext({ dataDir }) {
    return () => ({
        site: readJson(dataDir, "site"),
        projects: readJson(dataDir, "projects"),
        steps: readJson(dataDir, "steps"),
        socials: readJson(dataDir, "socials"),
        imageSizes: IMAGE_SIZES,
        buildDate: BUILT_AT.toISOString().slice(0, 10),
    });
}
