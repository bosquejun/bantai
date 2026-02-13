import debounce from "lodash.debounce";
import { useCallback, useEffect, useRef } from "react";

// Type that accepts both sync and async functions with any parameters
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
export function useDebounceCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 500
): T {
    // Use a ref to always point to the latest version of your callback
    const callbackRef = useRef(callback);
    const debouncedFnRef = useRef<((...args: Parameters<T>) => void) & { cancel: () => void } | undefined>(undefined);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Recreate debounced function when delay changes
    useEffect(() => {
        if (debouncedFnRef.current) {
            debouncedFnRef.current.cancel();
        }
        debouncedFnRef.current = debounce(
            (...args: Parameters<T>) => {
                // Call the callback - it can be sync or async, we don't await it
                // This allows both promise functions and normal functions to work
                callbackRef.current(...args);
            },
            delay
        );
    }, [delay]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            debouncedFnRef.current?.cancel();
        };
    }, []);

    // Return a stable function that triggers the debounced call
    // The function signature matches the original (preserves sync/async types)
    const debouncedFn = useCallback(
        (...args: Parameters<T>) => {
            // Only call through the debounced function, not directly
            debouncedFnRef.current?.(...args);
            // Return type is preserved for type checking, but actual return value
            // will be undefined since debouncing is fire-and-forget
        },
        []
    ) as T;

    return debouncedFn;
}
