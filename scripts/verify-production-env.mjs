import { pathToFileURL } from "node:url";

const required = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
];

export function productionEnvironment(values = process.env) {
  const missing = required.filter((name) => !values[name]?.trim());
  if (missing.length)
    throw new Error(`Missing production environment variables: ${missing.join(", ")}`);

  const siteUrl = new URL(values.NEXT_PUBLIC_SITE_URL);
  const supabaseUrl = new URL(values.NEXT_PUBLIC_SUPABASE_URL);
  if (siteUrl.protocol !== "https:")
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production");
  if (supabaseUrl.protocol !== "https:")
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS in production");
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(siteUrl.hostname))
    throw new Error("NEXT_PUBLIC_SITE_URL cannot use a loopback host in production");
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(supabaseUrl.hostname))
    throw new Error("NEXT_PUBLIC_SUPABASE_URL cannot use a loopback host in production");

  return {
    siteUrl: siteUrl.toString().replace(/\/$/, ""),
    supabaseUrl: supabaseUrl.toString().replace(/\/$/, ""),
    publishableKey: values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export async function verifyProductionEnvironment(
  values = process.env,
  request = fetch,
) {
  const environment = productionEnvironment(values);
  const response = await request(`${environment.supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: environment.publishableKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error(
      `Supabase rejected the configured publishable key (${response.status})`,
    );
  return environment;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const environment = await verifyProductionEnvironment();
  console.log(
    `Production environment verified for ${environment.siteUrl} using ${environment.supabaseUrl}`,
  );
}
