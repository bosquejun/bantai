// Get the global context declaration for a given workspace path
// This is used to declare the appContext variable globally in the workspace
// so that it can be used in the workspace
export function getGlobalContextDeclaration(workspacePath: string | null): string {
    if (!workspacePath) return "";
    return `
import { appContext as TContext } from "${workspacePath}/context";

declare global {
    const appContext: typeof TContext;
}

export {};
    `;
}
