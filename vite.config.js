import { resolve } from "node:path";
import handlebars from "vite-plugin-handlebars";
import imageOptimizer from "./src/assets/vite/image-optimizer.js";
import handlebarsContext from "./src/assets/vite/handlebars-context.js";
import handlebarsHelpers from "./src/assets/vite/handlebars-helpers.js";

const src = resolve(import.meta.dirname, "src");

// Public URL of the processed images, and the folder that serves it.
const RESIZED_URL = "/images/resized";

export default {
    root: "src",
    envDir: "../",
    plugins: [
        imageOptimizer({
            sourceDir: resolve(src, "assets/images"),
            outputDir: resolve(src, `public${RESIZED_URL}`),
            publicPath: RESIZED_URL,
            projectsFile: resolve(src, "data/projects.json"),
        }),
        handlebars({
            partialDirectory: resolve(src, "partials"),
            helpers: handlebarsHelpers,
            context: handlebarsContext({ dataDir: resolve(src, "data") }),
        }),
    ],
    server: { host: true },
    build: {
        // The image optimizer is meant to be slow — it is encoding photos,
        // not bundling. Skip the plugin timing report it always trips.
        rollupOptions: { checks: { pluginTimings: false } },
        outDir: "../dist",
        emptyOutDir: true,
        chunkSizeWarningLimit: 1000,
    },
};
