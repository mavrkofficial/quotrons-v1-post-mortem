#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = resolve(ROOT, "data");

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await filesUnder(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

const files = (await filesUnder(DATA)).sort();
const lines = [];
for (const file of files) {
  const content = await readFile(file);
  const hash = createHash("sha256").update(content).digest("hex");
  const path = relative(ROOT, file).replaceAll("\\", "/");
  lines.push(`${hash}  ${path}`);
}
await writeFile(resolve(ROOT, "SHA256SUMS"), `${lines.join("\n")}\n`);
console.log(`Wrote ${lines.length} SHA-256 checksums.`);
