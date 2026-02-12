import debounce from "lodash.debounce";
import { useEffect, useMemo, useState } from "react";

export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    const setter = useMemo(
        () => debounce((newValue: T) => setDebouncedValue(newValue), delay),
        [delay]
    );

    useEffect(() => {
        setter(value);
        // Cleanup if the value changes rapidly
        return () => setter.cancel();
    }, [value, setter]);

    return debouncedValue;
}
