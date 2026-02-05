import { defineContext } from '@bantai-dev/core';
import { createRedisStorage } from '@bantai-dev/storage-redis';
import {
  rateLimit,
  withRateLimit
} from '@bantai-dev/with-rate-limit';
import { z } from 'zod';


const redisStorage = createRedisStorage({ url: process.env.REDIS_URL }, rateLimit.storageSchema);

const apiContext = defineContext(
    z.object({
      userId: z.string().optional(),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']),
      endpoint: z.string(),
    })
  );

  export default withRateLimit(apiContext, {
    storage: redisStorage,
    generateKey: (input) => {
        if(input.userId){
            return `api:${input.userId}:${input.method} ${input.endpoint}`;
        }
        return `api:anonymous:${input.method} ${input.endpoint}`;
    },
  });