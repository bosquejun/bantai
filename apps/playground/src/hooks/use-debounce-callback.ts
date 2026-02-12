import debounce from "lodash.debounce";
import { useEffect, useMemo, useRef } from "react";

export function useDebounceCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 500
) {
    // Use a ref to always point to the latest version of your callback
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    // Memoize the debounced function using lodash
    const debouncedFn = useMemo(
        () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay),
        [delay]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => debouncedFn.cancel();
    }, [debouncedFn]);

    return debouncedFn;
}
