export const BANTAI_DEV_CORE_PACKAGE_NAME = "@bantai-dev/core";
export const BANTAI_DEV_CORE_PACKAGE_VERSION = "1.2.0";

export const BANTAI_DEV_CORE_GLOBAL_DECLARATION = `
declare global {
    const defineContext: typeof import("${BANTAI_DEV_CORE_PACKAGE_NAME}").defineContext;
    const defineRule: typeof import("${BANTAI_DEV_CORE_PACKAGE_NAME}").defineRule;
    const definePolicy: typeof import("${BANTAI_DEV_CORE_PACKAGE_NAME}").definePolicy;
    const deny: typeof import("${BANTAI_DEV_CORE_PACKAGE_NAME}").deny;
    const evaluatePolicy: typeof import("${BANTAI_DEV_CORE_PACKAGE_NAME}").evaluatePolicy;
    const allow: typeof import("${BANTAI_DEV_CORE_PACKAGE_NAME}").allow;
    const skip: typeof import("${BANTAI_DEV_CORE_PACKAGE_NAME}").skip;
}

export {};
`;

export default {
    [BANTAI_DEV_CORE_PACKAGE_NAME]: {
        name: BANTAI_DEV_CORE_PACKAGE_NAME,
        version: BANTAI_DEV_CORE_PACKAGE_VERSION,
        globalDeclaration: BANTAI_DEV_CORE_GLOBAL_DECLARATION,
    },
};
