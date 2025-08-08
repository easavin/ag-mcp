import { NextRequest, NextResponse } from 'next/server'
import { defaultRateLimiter } from '@/lib/rate-limit'

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'development' ? 1000 : 100, // higher limit in development
  apiMaxRequests: process.env.NODE_ENV === 'development' ? 500 : 50, // higher limit in development
}

function getRateLimitKey(request: NextRequest): string {
  // Use IP address or fallback to a default
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown'
  return ip
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.clarity.ms https://*.clarity.ms", // Next.js requires unsafe-eval and unsafe-inline, Clarity domains
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com https://sandboxapi.deere.com https://partnersandbox.deere.com https://partnerapi.deere.com https://equipmentapi.deere.com https://signin.johndeere.com https://www.clarity.ms https://*.clarity.ms",
    "frame-ancestors 'none'",
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  return response
}

function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.NEXTAUTH_URL,
  ].filter(Boolean)
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
  
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for favicon requests
  if (pathname === '/favicon.ico') {
    return NextResponse.next()
  }
  
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    return addCorsHeaders(response, request)
  }
  
  // Rate limiting
  const rateLimitKey = getRateLimitKey(request)
  const maxRequests = pathname.startsWith('/api/') ? RATE_LIMIT_CONFIG.apiMaxRequests : RATE_LIMIT_CONFIG.maxRequests
  const { allowed, resetTime } = await defaultRateLimiter.allow(rateLimitKey, maxRequests, RATE_LIMIT_CONFIG.windowMs)
  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
        },
      }
    )
  }
  
  // Continue with the request
  const response = NextResponse.next()
  
  // Add security headers
  addSecurityHeaders(response)
  
  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    addCorsHeaders(response, request)
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 