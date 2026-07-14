import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const standalone = resolve(root, ".next", "standalone");
const server = resolve(standalone, "server.js");
const packageManifest = resolve(standalone, "package.json");

if (!existsSync(server) || !statSync(server).isFile())
  throw new Error("Standalone build is missing server.js");
if (!existsSync(packageManifest) || !statSync(packageManifest).isFile())
  throw new Error("Standalone build is missing package.json");

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

const staticDirectory = resolve(standalone, ".next", "static");
if (!existsSync(staticDirectory) || !statSync(staticDirectory).isDirectory())
  throw new Error("Standalone build is missing copied static assets");

console.log("Standalone artifact verified at .next/standalone");
