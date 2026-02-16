/* eslint-disable @typescript-eslint/no-explicit-any */
import { loader, type Monaco } from "@monaco-editor/react";
import { js_beautify } from "js-beautify";
import * as monaco from "monaco-editor";

export async function initMonaco() {
    const monaco = await loader.init();
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        // noSemanticValidation: true,
        // noSyntaxValidation: true,
    });
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        allowNonTsExtensions: true,
        esModuleInterop: true,
        noImplicitAny: true,
        strict: true,
        alwaysStrict: true,
        allowSyntheticDefaultImports: true,
        baseUrl: "file:///",
        paths: {
            "*": ["*"],
        },
    });

    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

    monaco.languages.registerDocumentFormattingEditProvider("typescript", {
        provideDocumentFormattingEdits(model: monaco.editor.ITextModel) {
            const formatted = js_beautify(model.getValue(), {
                indent_size: 2,
                // 1. 'expand' puts braces on their own lines
                brace_style: "collapse",
                // 2. Forces wrapping when the line gets long (like your Zod schema)
                wrap_line_length: 40,
                // 3. Breaks chained methods (like .string().optional()) onto new lines
                break_chained_methods: true,
                // 4. Ensures the final closing char is handled correctly
                // end_with_newline: true,
            });

            return [
                {
                    range: model.getFullModelRange(),
                    text: formatted,
                },
            ];
        },
    });
}

export function setMonacoDeclarationTypes({
    monaco,
    dtsFiles,
    packageName,
}: {
    monaco: Monaco;
    dtsFiles: Array<{ path: string; text: string }>;
    packageName: string;
}) {
    for (const file of dtsFiles) {
        const { path, text } = file;
        let formattedText = text;
        const uri = `file:///node_modules/${packageName.replace("/", "-").replace("@", "")}/${path}`;

        if (packageName.startsWith("@")) {
            formattedText = `
            declare module "${packageName}" {
                ${formattedText}
            }
            `;
        }

        monaco.languages.typescript.typescriptDefaults.addExtraLib(formattedText, uri);
    }
}

export function setMonacoGlobalDeclarationTypes({
    monaco,
    packageName,
    globalDeclaration,
}: {
    monaco: Monaco;
    packageName: string;
    globalDeclaration: string;
    path?: string;
}) {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
        globalDeclaration,
        `file:///global/${packageName.replace("/", "-").replace("@", "")}-global.d.ts`
    );
}

export function resetMonacoDeclarationTypes(monaco: Monaco) {
    monaco.languages.typescript.typescriptDefaults.setExtraLibs([]);
}

// export function inferMonacoDeclarationTypes(monaco: Monaco, schema: any, alias: string) {
//   const inferredSchema = inferZodSchema(schema, alias)
//   setMonacoDeclarationTypes({monaco, dtsFiles: [{
//      path:`inferred/${alias}.d.ts`,
//      text: inferredSchema,
//   }], packageName: 'context'});

//   setMonacoGlobalDeclarationTypes({monaco, packageName: 'context', globalDeclaration: '', path: '/inferred'})
// }

// 3. Define an interface for your clean error objects
interface FormattedError {
    category: "Syntax" | "Semantic";
    line: number;
    column: number;
    message: string;
}

export async function transpileCode(
    monaco: Monaco,
    editor: monaco.editor.ICodeEditor
): Promise<{
    errors: FormattedError[];
    transpiledCodes: Array<{ path: string; text: string }>;
}> {
    const model = editor.getModel();
    if (!model) return { errors: [], transpiledCodes: [] };

    const uri = model.uri;

    // Get the TypeScript worker instance
    const worker = await monaco.languages.typescript.getTypeScriptWorker();
    const client = await worker(uri);

    // Request the transpiled JavaScript output
    const result = await client.getEmitOutput(uri.toString());

    // 2. Fetch both categories of diagnostics
    const [syntax, semantic] = await Promise.all([
        client.getSyntacticDiagnostics(uri.toString()),
        client.getSemanticDiagnostics(uri.toString()),
    ]);

    const format = (list: any[], cat: "Syntax" | "Semantic"): FormattedError[] => {
        return list.map((diag) => {
            // Convert flat string offset (start) to line/column
            const pos = model.getPositionAt(diag.start);

            return {
                category: cat,
                line: pos.lineNumber,
                column: pos.column,
                // Handle nested message chains (common in TS)
                message:
                    typeof diag.messageText === "string"
                        ? diag.messageText
                        : diag.messageText.messageText,
            };
        });
    };

    const allErrors = [...format(syntax, "Syntax"), ...format(semantic, "Semantic")];

    const transpiledCodes = result.outputFiles.map((file: any) => ({
        path: file.path,
        text: file.text,
    }));

    return {
        errors: allErrors,
        transpiledCodes,
    };
}

export function getEditorErrors(monaco: Monaco, editor: monaco.editor.ICodeEditor) {
    const editorModel = editor.getModel();
    if (!editorModel) return [];
    const markers = monaco.editor.getModelMarkers({ resource: editorModel.uri });
    return markers.filter(
        (marker: monaco.editor.IMarker) => marker.severity === monaco.MarkerSeverity.Error
    );
}
