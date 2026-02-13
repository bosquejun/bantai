export function getCompleteContext(code: string | null): string {
    if (!code) return "";
    return `
export const appContext = ${code};\n

export default appContext;
    `;
}
