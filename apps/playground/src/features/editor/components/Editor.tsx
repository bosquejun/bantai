import { useGlobalStore } from "@/shared/store";
import { Editor as Monaco, type EditorProps } from "@monaco-editor/react";
import React from "react";

// Use type intersection to ensure all EditorProps are correctly inherited
// This is more robust than interface extension for library types
type BantaiEditorProps = EditorProps & {
    label?: string;
    onDirty?: (dirty: boolean) => void;
};

export const Editor: React.FC<BantaiEditorProps> = (props) => {
    const theme = useGlobalStore((state) => state.theme);

    // Destructure properties to handle defaults and separate custom props from Monaco props
    const {
        label,
        value,
        onChange,
        language = "typescript",
        height = "100%",
        options,
        onDirty,
        ...rest
    } = props;

    return (
        <div className="flex flex-col w-full h-full bg-background overflow-hidden s">
            {label && (
                <div className="h-8 flex items-center px-4 bg-muted border-b border-border text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    {label}
                </div>
            )}
            <div className="flex-1 min-h-0 relative">
                <Monaco
                    theme={theme === "dark" ? "vs-dark" : "light"}
                    language={language}
                    value={value}
                    onChange={onChange}
                    height={height}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineHeight: 1.6,
                        fontFamily: "JetBrains Mono",
                        padding: { top: 12, bottom: 12 },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        ...options,
                    }}
                    {...rest}
                />
            </div>
        </div>
    );
};
