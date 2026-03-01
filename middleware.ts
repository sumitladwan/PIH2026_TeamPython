import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Environment validation for API routes ---
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json(
        { error: 'Server configuration error', message: 'MONGODB_URI is not set' },
        { status: 500 }
      );
    }
    if (mongoUri.includes('<') || mongoUri.includes('>')) {
      console.error('❌ MONGODB_URI contains unresolved placeholders');
      return NextResponse.json(
        {
          error: 'Server configuration error',
          message: 'MONGODB_URI contains unresolved placeholders. Copy the real connection string from MongoDB Atlas → Connect → Drivers.',
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
