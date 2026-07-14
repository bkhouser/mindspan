import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(1),
  INITIAL_SYS_ADMIN_EMAIL: z.string().email().optional(),
});

function runtimeVariable(name: string) {
  return Reflect.get(process.env, name) as string | undefined;
}

export function hasSupabaseEnv() {
  return Boolean(
    runtimeVariable("NEXT_PUBLIC_SUPABASE_URL") &&
    runtimeVariable("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );
}

export function publicEnv() {
  // Dynamic lookups are intentional. Next.js inlines direct NEXT_PUBLIC_* access
  // at build time, but Mindspan's self-hosted standalone artifact must remain
  // portable between environments.
  return publicSchema.parse({
    NEXT_PUBLIC_SITE_URL:
      runtimeVariable("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: runtimeVariable("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      runtimeVariable("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  });
}

export function serverEnv() {
  return serverSchema.parse({
    ...publicEnv(),
    SUPABASE_SECRET_KEY: runtimeVariable("SUPABASE_SECRET_KEY"),
    INITIAL_SYS_ADMIN_EMAIL: runtimeVariable("INITIAL_SYS_ADMIN_EMAIL"),
  });
}
