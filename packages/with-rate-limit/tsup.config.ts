import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],

    format: ["esm"],
    target: "es2022",

    dts: true,
    sourcemap: true,
    clean: true,

    outDir: "dist",

    // Bundle everything into one file
    bundle: true,
    splitting: false,
    treeshake: true,

    // Do NOT bundle deps like zod
    external: ["zod", "ms"],

    // Single output file
    outExtension() {
        return {
            js: ".js",
        };
    },
});
