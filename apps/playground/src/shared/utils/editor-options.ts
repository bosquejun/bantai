import type { editor } from "monaco-editor";

export const defaultEditorOptions: editor.IStandaloneEditorConstructionOptions = {
    lineNumbers: "on",
    minimap: { enabled: false },
    fixedOverflowWidgets: true,
    folding: true,
    lineNumbersMinChars: 3,
    scrollbar: {
        vertical: "hidden",
        horizontal: "hidden",
        alwaysConsumeMouseWheel: false,
    },
    wordWrap: "on",
    wrappingIndent: "deepIndent",
    wrappingStrategy: "advanced",
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    automaticLayout: true,
};
