import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/school', '/school/register', '/about', '/history', '/contact', '/admissions',
  '/gallery', '/our-staff', '/policy', '/classrooms', '/principal-speech', '/forgot-password', '/reset-password',
  '/features', '/how-it-works', '/get-a-demo', '/reach-us'];

const VALID_ROLES = new Set(['student', 'staff', 'admin']);

function clearAuthCookies(res: NextResponse) {
  res.cookies.set('gka_token', '', { expires: new Date(0), path: '/' });
  res.cookies.set('gka_refresh_token', '', { expires: new Date(0), path: '/' });
  res.cookies.set('gka_user', '', { expires: new Date(0), path: '/' });
  res.cookies.set('gka_role', '', { expires: new Date(0), path: '/' });
  return res;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('gka_token')?.value;
  const role = request.cookies.get('gka_role')?.value;

  // Catch malformed /null/* paths (e.g. /null/dashboard from missing school slug)
  if (pathname.startsWith('/null/') || pathname === '/null') {
    const res = NextResponse.redirect(new URL('/login', request.url));
    return clearAuthCookies(res);
  }

  // Allow public paths and static assets
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    // Redirect authenticated users away from login
    if (pathname === '/login' && token && role && VALID_ROLES.has(role)) {
      return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
    }
    // If cookies exist but role is invalid, clear them to prevent redirect loops
    if (pathname === '/login' && (token || role) && (!role || !VALID_ROLES.has(role))) {
      const res = NextResponse.redirect(new URL('/login', request.url));
      return clearAuthCookies(res);
    }
    return NextResponse.next();
  }

  // Protected portal routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Reject invalid/malformed auth cookies early
  if (!role || !VALID_ROLES.has(role)) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    return clearAuthCookies(res);
  }

  // Role enforcement
  const segment = pathname.split('/')[1]; // 'student' | 'staff' | 'admin'
  if (['student', 'staff', 'admin'].includes(segment) && role !== segment) {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets|images).*)'],
};
