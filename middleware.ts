import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import PRIVATE_ROUTES from 'utilities/constant-private-routes';
import PUBLIC_ROUTES from 'utilities/constant-public-routes';

export const config = {
  matcher: ['/((?!api|_next/static|favicon.ico).*)'],
};

export const middleware = async (req: NextRequest) => {
  const res = NextResponse.next();

  const session = await createMiddlewareSupabaseClient({
    req,
    res,
  }).auth.getSession();

  if (PUBLIC_ROUTES.includes(req.nextUrl.pathname) && session.data.session) {
    return NextResponse.redirect(new URL('/subjects', req.url));
  }

  if (
    PRIVATE_ROUTES.some((p) => req.nextUrl.pathname.startsWith(p)) &&
    !session.data.session
  ) {
    return NextResponse.redirect(
      new URL(
        `/sign-in?redirect=${encodeURIComponent(req.nextUrl.pathname)}`,
        req.url
      )
    );
  }

  return res;
};
