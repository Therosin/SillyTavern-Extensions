/**
 * This script automates workspace-related tasks for SillyTavern extensions, such as fetching type files and updating configurations.
 * It helps maintain an up-to-date and well-structured development environment for building SillyTavern extensions using Deno and TypeScript.
 */

import * as esbuild from 'npm:esbuild';

// original type definitions from SillyTavern repository
const GLOBAL_TYPES_URL = "https://raw.githubusercontent.com/SillyTavern/SillyTavern/release/public/global.d.ts";

// Helper function to write text content to a file
const writeTextFile = async (path: string, content: string): Promise<void> => {
    try {
        await Deno.writeTextFile(path, content);
        console.log(`✅ File written successfully: ${path}`);
    } catch (error) {
        console.error(`❌ Error writing file: ${path}`, error);
    }
};

// Extend this with new tasks as needed to streamline workspace management
const workspaceUtils = async (task: string): Promise<void> => {
    switch (task) {
        case "sync:globalTypes":
            await updateGlobalTypes();
            break;
        case "sync:importMap":
            await updateImportMap();
            break;
        case "build":
            await buildProject();
            break;
        default:
            console.error(`❌ Unknown task: ${task}. Available tasks are: sync:globalTypes, sync:importMap, build`);
    }
};

const SillyTavernGlobalDeclaration = `
declare interface SillyTavern {
    getContext(): any;
    llm: any;
};
declare var SillyTavern: SillyTavern;
`;

// Known fixups to align type definitions with Deno.
const transformations = [
    { pattern: /: function/g, replacement: ": () => void" },
    { pattern: /declare var SillyTavern: \{\s*getContext\(\): any;\s*llm: any;\s*\};/g, replacement: SillyTavernGlobalDeclaration }
];

const fixGlobalTypes = (content: string): string => {
    transformations.forEach(({ pattern, replacement }) => {
        content = content.replace(pattern, replacement);
    });
    return content;
};


const updateGlobalTypes = async (): Promise<void> => {
    console.log("🔄 Fetching the latest type definitions from SillyTavern...");
    try {
        const response = await fetch(GLOBAL_TYPES_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch global types: ${response.status} ${response.statusText}`);
        }
        let content = await response.text();

        // inject ts-nocheck directive to disable type checking for the entire file
        content = `// @ts-nocheck This file is automatically generated by workspace-utils.\n// deno-lint-ignore-file\n${content}`;

        // process known fixups to align type definitions with Deno.
        content = fixGlobalTypes(content);

        // Write the modified content to a local file in the types directory
        const outputPath = "./types/sillytavern_global.d.ts";
        await writeTextFile(outputPath, content);
        console.log(`✅ Updated type definition file saved at ${outputPath}`);
    } catch (error) {
        console.error("❌ Error updating type definitions:", error);
    }
};

const updateImportMap = async (): Promise<void> => {
    console.log("🔄 Updating import map...");
    try {
        const imports = {
            "react": "https://esm.sh/react@18.3.1",
            "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
            "react-dom": "https://esm.sh/react-dom",
            "react-dom/client": "https://esm.sh/react-dom/client",
            "jquery": "https://esm.sh/jquery@latest",
            "sillytavern/global": "./types/sillytavern_global.d.ts",
            "sillytavern/script": "https://raw.githubusercontent.com/SillyTavern/SillyTavern/release/public/script.js"
        };
        await writeTextFile("./import_map.json", JSON.stringify({ imports }, null, 2));
        console.log(`✅ Import map updated successfully.`);
    } catch (error) {
        console.error(`❌ Error updating import map:`, error);
    }
};

// Builds the project using esbuild
const buildProject = async (): Promise<void> => {
    try {
        console.log("🔨 Building the project with esbuild...");

        await esbuild.build({
            entryPoints: ['src/index.ts'],
            outfile: 'dist/extension.js',
            bundle: true,
            format: 'esm',
            platform: 'browser',
            sourcemap: true,
            external: ['sillytavern/global', 'sillytavern/script'],
        });

        console.log("✅ Build succeeded.");
    } catch (error) {
        console.error("❌ Build failed:", error);
        Deno.exit(1);
    }
};


// Run the workspaceUtils function with the provided task parameter when this script is executed
const task = Deno.args[0];
if (task) {
    workspaceUtils(task).catch(error => console.error("❌ An error occurred while executing the task:", error));
} else {
    console.error("❌ No task provided. Please specify a task to run. Examples: deno task sync:globalTypes, deno task sync:importMap, deno task build");
}
