import { evaluatePolicy } from '@bantai-dev/core'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { rateLimitPolicy } from './lib/bantai/policy'
 
// This function can be marked `async` if using `await` inside
export async function proxy(request: NextRequest) {
    
    const result = await evaluatePolicy(rateLimitPolicy, {
        endpoint: request.nextUrl.pathname,
        method: request.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD',
        userId: request.headers.get('x-user-id') || undefined,
    })

    if(!result.isAllowed){
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    return NextResponse.next()
}

export const config = {
    // Only triggers middleware for routes starting with /api
    matcher: "/api/:path*",
  };