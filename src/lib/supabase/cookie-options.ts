export const AUTH_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function authCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}
