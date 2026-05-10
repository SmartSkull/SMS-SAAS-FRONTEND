import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/about', '/history', '/contact', '/admissions',
  '/gallery', '/our-staff', '/policy', '/classrooms', '/principal-speech'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('gka_token')?.value;
  const role = request.cookies.get('gka_role')?.value;

  // Allow public paths and static assets
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    // Redirect authenticated users away from login
    if (pathname === '/login' && token && role) {
      return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
    }
    return NextResponse.next();
  }

  // Protected portal routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role enforcement
  const segment = pathname.split('/')[1]; // 'student' | 'staff' | 'admin'
  if (['student', 'staff', 'admin'].includes(segment) && role !== segment) {
    return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets).*)'],
};
