import { createAuxiliaryTypeStore, createTypeAlias, printNode, zodToTs } from 'zod-to-ts';
const auxiliaryTypeStore = createAuxiliaryTypeStore()



export function inferZodSchema(schema:any, alias: string) {
  const {node} = zodToTs(schema, { auxiliaryTypeStore })
  const context = createTypeAlias(node, alias)
  return printNode(context);
}

