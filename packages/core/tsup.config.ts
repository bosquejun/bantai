import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/**/*.ts", "!src/**/*.test.ts"],

    format: ["esm"],
    target: "es2022",

    dts: true,
    sourcemap: true,
    clean: true,

    outDir: "dist",

    // Emit one JS file per TS file, preserving folder structure
    bundle: false,
    splitting: false,
    treeshake: true,

    // Do NOT bundle deps like zod
    external: ["zod"],

    outExtension() {
        return {
            js: ".js",
        };
    },
});
