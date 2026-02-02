import z from "zod"


export interface StorageAdapter<T> {
    get(key: string): Promise<T | undefined>
    set(key: string, value: T, ttlMs?: number): Promise<void>
    delete(key: string): Promise<void>
  
    update?(
      key: string,
      updater: (current: T | undefined) => {
        value: T
        ttlMs?: number
      } | null
    ): Promise<T | undefined>
  }
  


  // export function createMemoryStorage<T extends z.ZodRawShape>(schema: z.ZodObject<T>): StorageAdapter<z.infer<typeof schema>> {

  //   const store = new Map<string, any>()
  //   const locks = new Map<string, Promise<void>>()
  
  //   async function withLock<T>(key: string, fn: () => Promise<T>) {
  //     const prev = locks.get(key) ?? Promise.resolve()
  //     let release!: () => void
  //     const next = new Promise<void>((r) => (release = r))
  //     locks.set(key, prev.then(() => next))
  
  //     await prev
  //     try {
  //       return await fn()
  //     } finally {
  //       release()
  //       locks.delete(key)
  //     }
  //   }
  
  //   return {
  //     async get(key) {
  //       return store.get(key)
  //     },
  
  //     async set(key, value) {
  //       schema.parse(value);
  //       store.set(key, value)
  //     },
  
  //     async delete(key) {
  //       store.delete(key)
  //     },
  
  //     async update(key, updater) {
  //       return withLock(key, async () => {
  //         const current = store.get(key)
  //         const res = updater(current)
  //         if (!res) return current
  //         store.set(key, res.value)
  //         return res.value
  //       })
  //     }
  //   }
  // }

  // Option 1: Use ZodType instead of ZodObject with ZodRawShape
export function createMemoryStorage<T extends z.ZodType>(
  schema: T
): StorageAdapter<z.infer<T>> {
  const store = new Map<string, any>()
  const locks = new Map<string, Promise<void>>()

  async function withLock<T>(key: string, fn: () => Promise<T>) {
    const prev = locks.get(key) ?? Promise.resolve()
    let release!: () => void
    const next = new Promise<void>((r) => (release = r))
    locks.set(key, prev.then(() => next))

    await prev
    try {
      return await fn()
    } finally {
      release()
      locks.delete(key)
    }
  }

  return {
    async get(key) {
      return store.get(key)
    },

    async set(key, value) {
      schema.parse(value);
      store.set(key, value)
    },

    async delete(key) {
      store.delete(key)
    },

    async update(key, updater) {
      return withLock(key, async () => {
        const current = store.get(key)
        const res = updater(current)
        if (!res) return current
        store.set(key, res.value)
        return res.value
      })
    }
  }
}
  
