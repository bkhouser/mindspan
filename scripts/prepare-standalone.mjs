import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import nextEnv from "@next/env";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
nextEnv.loadEnvConfig(root);
const standalone = resolve(root, ".next", "standalone");
const server = resolve(standalone, "server.js");
const packageManifest = resolve(standalone, "package.json");

if (!existsSync(server) || !statSync(server).isFile())
  throw new Error("Standalone build is missing server.js");
if (!existsSync(packageManifest) || !statSync(packageManifest).isFile())
  throw new Error("Standalone build is missing package.json");

function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (publishableKey) {
  const embeddedIn = [
    ...filesUnder(resolve(root, ".next", "server")),
    ...filesUnder(resolve(root, ".next", "static")),
  ].find((file) => readFileSync(file).includes(Buffer.from(publishableKey)));
  if (embeddedIn)
    throw new Error(
      `Supabase publishable key was embedded at build time: ${embeddedIn}`,
    );
}

function copyDirectory(source, destination) {
  if (!existsSync(source)) return;
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(resolve(destination, ".."), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

copyDirectory(
  resolve(root, ".next", "static"),
  resolve(standalone, ".next", "static"),
);
copyDirectory(resolve(root, "public"), resolve(standalone, "public"));
mkdirSync(resolve(standalone, "scripts"), { recursive: true });
cpSync(
  resolve(root, "scripts", "verify-production-env.mjs"),
  resolve(standalone, "scripts", "verify-production-env.mjs"),
);

const staticDirectory = resolve(standalone, ".next", "static");
if (!existsSync(staticDirectory) || !statSync(staticDirectory).isDirectory())
  throw new Error("Standalone build is missing copied static assets");

console.log(
  "Standalone artifact verified with runtime-only Supabase credentials at .next/standalone",
);
