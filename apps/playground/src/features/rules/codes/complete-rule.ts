export function getCompleteRule(code: string | null): string {
    if (!code) return "";
    return `
import appContext from '../context';

const rule = ${code}

export default rule;
    `;
}
