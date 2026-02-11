import {
    ContextDefinition,
    defineContext,
    ExtractContextShape,
    ExtractContextTools,
} from "@bantai-dev/core";
import { z } from "zod";
import { StorageAdapter } from "./storage.js";

type StorageMap<TStorageDataSchema extends z.ZodType, TStorageNames extends string = string> = Map<
    string,
    StorageAdapter<z.infer<TStorageDataSchema>>
> & {
    get<K extends TStorageNames>(key: K): StorageAdapter<z.infer<TStorageDataSchema>> | undefined;
    has<K extends TStorageNames>(key: K): boolean;
};

// Get all storage names (existing + new)
type AllStorageNames<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TStorageName extends string,
> =
    ExtractContextTools<TContext> extends { storage: StorageMap<any, infer N> }
        ? N | TStorageName
        : TStorageName;

export type WithStorageTools<
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TStorageDataSchema extends z.ZodType,
    TStorageName extends string,
> = Omit<ExtractContextTools<TContext>, "storage"> & {
    storage: StorageMap<TStorageDataSchema, AllStorageNames<TContext, TStorageName>>;
};

/**
 * Extends a context with storage capabilities.
 * Adds a storage adapter to the context's tools without modifying the schema.
 *
 * @example
 * ```ts
 * const context = withStorage(baseContext, storage, { storageName: "users" });
 * // Later, access with type inference:
 * const userStorage = context.tools.storage.get("users"); // TypeScript knows "users" is valid
 * ```
 */
export const withStorage = <
    TContext extends ContextDefinition<z.ZodRawShape, Record<string, unknown>>,
    TStorageDataSchema extends z.ZodType,
    TStorageName extends string,
>(
    context: TContext,
    storage: StorageAdapter<z.infer<TStorageDataSchema>>,
    options: {
        storageName: TStorageName;
    }
): ContextDefinition<
    ExtractContextShape<TContext>,
    WithStorageTools<TContext, TStorageDataSchema, TStorageName>
> => {
    // Get existing storage map or create new one
    const existingStorage = (context.tools as any).storage as
        | StorageMap<TStorageDataSchema, any>
        | undefined;
    const storageMap = (
        existingStorage instanceof Map
            ? existingStorage
            : new Map<string, StorageAdapter<z.infer<TStorageDataSchema>>>()
    ) as StorageMap<TStorageDataSchema, AllStorageNames<TContext, TStorageName>>;

    // Only set if storage name doesn't exist (reuse existing)
    if (!storageMap.has(options.storageName)) {
        storageMap.set(options.storageName, storage);
    }

    return defineContext(context.schema, {
        tools: {
            ...context.tools,
            storage: storageMap,
        },
        defaultValues: context.defaultValues,
    }) as ContextDefinition<
        ExtractContextShape<TContext>,
        WithStorageTools<TContext, TStorageDataSchema, TStorageName>
    >;
};
