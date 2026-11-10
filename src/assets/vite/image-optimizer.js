import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Output sizes. 1800px is 2x the main container width to support retina displays.
const SIZES = [
    { w: 1800, dir: "desktop" },
    { w: 900, dir: "mobile" },
    // Tiny stand-in shown blurred until lazy loading swaps in the real
    // image, when site.json's "imageBlur" is true.
    { w: 32, dir: "placeholder" },
];

// Output formats, each with its sharp encoder.
const FORMATS = [
    { ext: "jpg", encode: (img) => img.jpeg({ quality: 80 }) },
    { ext: "webp", encode: (img) => img.webp({ quality: 80 }) },
    { ext: "avif", encode: (img) => img.avif({ quality: 60 }) },
];

// Allowed type name
const SOURCE_EXTS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".tif",
    ".tiff",
    ".webp",
    ".avif",
];

// IMAGE OPTIMIZER
// ------------------------------------------------------------
// Vite plugin that runs at build time to process every source image.
// Reads <sourceDir>/**, writes each image in three sizes and three formats to
// <outputDir>/<same subfolders>/<size>/, mirroring the source structure.
// An image is re-encoded only when its source is newer than its outputs.
// Output names carry a hash of the source, so an edited image gets a new
// URL and browsers never serve a stale cached copy.
// Once everything is generated, each project's image paths are written back
// into projects.json, so the templates never have to guess a filename.
export default function imageOptimizer({
    sourceDir,
    outputDir,
    publicPath,
    projectsFile,
}) {
    return {
        name: "image-optimizer",
        // config, not buildStart: Vite lists the public folder before
        // buildStart, and would then trip over the stale files removed here.
        async config() {
            // Check if source directory exist. Stops here if it does not.
            if (!fs.existsSync(sourceDir)) return;

            // Filter images by extension, keeping only allowed ones.
            const images = fs
                .readdirSync(sourceDir, { recursive: true })
                .filter((file) =>
                    SOURCE_EXTS.includes(path.extname(file).toLowerCase()),
                );

            // Folder name -> the basenames generated for it.
            const generated = {};
            // "<folder>/<basename>" -> its dominant colour (CSS rgb()) and
            // source dimensions, so the frame holds its shape before loading.
            const details = {};
            // Every output this build expects; anything else is stale.
            const expected = new Set();

            for (const image of images) {
                const { dir, name } = path.parse(image);
                (generated[dir] ??= []).push(name);
                const source = path.join(sourceDir, image);
                const hashed = `${name}-${hashFile(source)}`;

                // shortcut: reads every source on each build, cache it if builds get slow.
                const [{ dominant: { r, g, b } }, { width, height }] =
                    await Promise.all([sharp(source).stats(), sharp(source).metadata()]);
                details[`${dir}/${name}`] = { hashed, color: `rgb(${r}, ${g}, ${b})`, width, height };

                for (const { w, dir: size } of SIZES) {
                    const target = path.join(outputDir, dir, size);
                    fs.mkdirSync(target, { recursive: true });

                    const conversions = FORMATS.flatMap(({ ext, encode }) => {
                        const output = path.join(target, `${hashed}.${ext}`);
                        expected.add(output);

                        // Returning [] drops this one from the batch.
                        if (isFresh(source, output)) return [];

                        return encode(sharp(source).resize(w)).toFile(output);
                    });

                    await Promise.all(conversions);
                }
            }

            removeStale(outputDir, expected);
            writeProjectPaths({ generated, details, publicPath, projectsFile });
        },
    };
}

// An output is still current when it exists and is newer than its source.
function isFresh(source, output) {
    return (
        fs.existsSync(output) &&
        fs.statSync(output).mtimeMs > fs.statSync(source).mtimeMs
    );
}

// First 8 hex chars of the file's MD5: enough to tell versions apart.
function hashFile(file) {
    return crypto
        .createHash("md5")
        .update(fs.readFileSync(file))
        .digest("hex")
        .slice(0, 8);
}

// Delete outputs no source produces any more (older hashes, removed
// images), so they are not shipped with the build.
function removeStale(outputDir, expected) {
    for (const file of fs.readdirSync(outputDir, { recursive: true })) {
        const output = path.join(outputDir, file);
        if (fs.statSync(output).isFile() && !expected.has(output)) {
            fs.rmSync(output);
        }
    }
}

// Replace each project's "images" with the paths just generated for it,
// keeping any alt text already written against the same filename.
function writeProjectPaths({ generated, details, publicPath, projectsFile }) {
    const before = fs.readFileSync(projectsFile, "utf8");
    const projects = JSON.parse(before);

    for (const project of projects) {
        // Keyed by the name without its hash, so alts survive an image update.
        const previousAlt = Object.fromEntries(
            (project.images ?? []).map((image) => [
                path.basename(image.mobile ?? "").replace(/-[0-9a-f]{8}$/, ""),
                image.alt ?? "",
            ]),
        );

        project.images = (generated[project.path] ?? []).sort().map((name) => {
            const { hashed, ...detail } = details[`${project.path}/${name}`];
            return {
                alt: previousAlt[name] ?? "",
                desktop: `${publicPath}/${project.path}/desktop/${hashed}`,
                mobile: `${publicPath}/${project.path}/mobile/${hashed}`,
                placeholder: `${publicPath}/${project.path}/placeholder/${hashed}`,
                ...detail,
            };
        });
    }

    // Only touch the file when something actually changed, so the dev
    // server does not reload on every build.
    const after = JSON.stringify(projects, null, 4) + "\n";
    if (after !== before) fs.writeFileSync(projectsFile, after);
}
