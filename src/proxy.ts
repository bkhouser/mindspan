import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

export async function proxy(request: NextRequest) {
  const runtimeVariable = (name: string) =>
    Reflect.get(process.env, name) as string | undefined;
  const supabaseUrl = runtimeVariable("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = runtimeVariable(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  if (!supabaseUrl || !publishableKey) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    supabaseUrl,
    publishableKey,
    {
      cookieOptions: authCookieOptions(),
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
