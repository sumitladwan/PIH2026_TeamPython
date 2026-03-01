import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Environment validation for ALL API routes (including /api/auth/register) ---
  if (pathname.startsWith('/api')) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error', message: 'MONGODB_URI is not set. Add it in Railway Variables.' },
        { status: 500 }
      );
    }
    if (mongoUri.includes('<') || mongoUri.includes('>')) {
      console.error(
        `❌ MONGODB_URI contains unresolved placeholders: ${mongoUri.substring(0, 80)}...\n` +
        `   Fix: Go to MongoDB Atlas → Cluster → Connect → Drivers → Node.js\n` +
        `   Copy the REAL connection string and paste it in Railway Variables`
      );
      return NextResponse.json(
        {
          error: 'Server configuration error',
          message: 'MONGODB_URI contains placeholder values like <cluster> or <password>. ' +
            'Go to MongoDB Atlas → Cluster → Connect → Drivers → Node.js, copy the real connection string, ' +
            'and update MONGODB_URI in Railway environment variables.',
          example: 'mongodb+srv://yourUser:yourPassword@cluster0.abc123.mongodb.net/hackshield'
        },
        { status: 500 }
      );
    }
  }

  // --- Public routes that don't require authentication ---
  const publicRoutes = ['/', '/auth/login', '/auth/register'];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith('/api/auth')
  );

  if (isPublicRoute) {
    const token = await getToken({ req: request });
    if (token && (pathname === '/auth/login' || pathname === '/auth/register')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // --- Protected routes – require authentication ---
  const token = await getToken({ req: request });
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- Role-based access control ---
  const userRole = token.role as string;

  if (pathname.startsWith('/dashboard/hackathons/create') && userRole !== 'organization') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (pathname.startsWith('/dashboard/ide') && userRole !== 'participant') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (
    pathname.startsWith('/dashboard/projects') &&
    userRole !== 'contributor' &&
    userRole !== 'participant'
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon.ico, public files (static assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
