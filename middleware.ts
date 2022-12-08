import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!api|_next/static|favicon.ico).*)'],
};

export const middleware = async (req: NextRequest) => {
  const res = NextResponse.next();
  const session = await createMiddlewareSupabaseClient({
    req,
    res,
  }).auth.getSession();

  if (
    ['/', '/sign-in', '/sign-up'].includes(req.nextUrl.pathname) &&
    session.data.session
  ) {
    return NextResponse.redirect(new URL('/subjects', req.url));
  }

  if (
    ['/subjects'].some((p) => req.nextUrl.pathname.startsWith(p)) &&
    !session.data.session
  ) {
    return NextResponse.redirect(
      new URL(`/sign-in?redirect=${encodeURI(req.nextUrl.pathname)}`, req.url)
    );
  }

  return res;
};
