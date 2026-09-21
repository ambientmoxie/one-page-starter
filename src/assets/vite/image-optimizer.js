import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Output sizes. 1800px is 2x the main container width to support retina displays.
const SIZES = [
    { w: 1800, dir: "desktop" },
    { w: 900, dir: "mobile" },
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
// Reads <sourceDir>/**, writes each image in two sizes and three formats to
// <outputDir>/<same subfolders>/<size>/, mirroring the source structure.
// An image is re-encoded only when its source is newer than its outputs.
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
        async buildStart() {
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

            for (const image of images) {
                const { dir, name } = path.parse(image);
                (generated[dir] ??= []).push(name);
                const source = path.join(sourceDir, image);

                for (const { w, dir: size } of SIZES) {
                    const target = path.join(outputDir, dir, size);
                    fs.mkdirSync(target, { recursive: true });

                    const conversions = FORMATS.flatMap(({ ext, encode }) => {
                        const output = path.join(target, `${name}.${ext}`);

                        // Returning [] drops this one from the batch.
                        if (isFresh(source, output)) return [];

                        return encode(sharp(source).resize(w)).toFile(output);
                    });

                    await Promise.all(conversions);
                }
            }

            writeProjectPaths({ generated, publicPath, projectsFile });
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

// Replace each project's "images" with the paths just generated for it,
// keeping any alt text already written against the same filename.
function writeProjectPaths({ generated, publicPath, projectsFile }) {
    const before = fs.readFileSync(projectsFile, "utf8");
    const projects = JSON.parse(before);

    for (const project of projects) {
        const previousAlt = Object.fromEntries(
            (project.images ?? []).map((image) => [
                path.basename(image.mobile ?? ""),
                image.alt ?? "",
            ]),
        );

        project.images = (generated[project.path] ?? []).sort().map((name) => ({
            alt: previousAlt[name] ?? "",
            desktop: `${publicPath}/${project.path}/desktop/${name}`,
            mobile: `${publicPath}/${project.path}/mobile/${name}`,
        }));
    }

    // Only touch the file when something actually changed, so the dev
    // server does not reload on every build.
    const after = JSON.stringify(projects, null, 4) + "\n";
    if (after !== before) fs.writeFileSync(projectsFile, after);
}
