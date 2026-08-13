#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  concatHex,
  encodeAbiParameters,
  keccak256,
} from "viem";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function text(path) {
  return readFile(resolve(ROOT, path), "utf8");
}

function dataRows(csvText) {
  return csvText.trimEnd().split(/\r?\n/).length - 1;
}

function recomputeLeaf(meta, leaf) {
  const encoded = encodeAbiParameters(
    [
      { type: "bytes32" },
      { type: "uint256" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint8" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    [
      meta.leafDomain,
      BigInt(meta.chainId),
      meta.legacy.legacy,
      BigInt(meta.snapshotBlock),
      leaf.kind,
      leaf.account,
      BigInt(leaf.v1Id),
      BigInt(leaf.v2Id),
      BigInt(leaf.amount),
    ],
  );
  return keccak256(concatHex([keccak256(encoded)]));
}

function recomputeRoot(leaves) {
  let level = [...leaves].sort((a, b) => a.localeCompare(b));
  while (level.length > 1) {
    const next = [];
    for (let index = 0; index < level.length; index += 2) {
      if (index + 1 === level.length) {
        next.push(level[index]);
      } else {
        const pair = [level[index], level[index + 1]]
          .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        next.push(keccak256(concatHex(pair)));
      }
    }
    level = next;
  }
  return level[0];
}

const checksumText = await text("SHA256SUMS");
for (const line of checksumText.trim().split(/\r?\n/)) {
  const match = line.match(/^([a-f0-9]{64})  (.+)$/);
  assert(match, `Malformed checksum line: ${line}`);
  const [, expected, path] = match;
  const content = await readFile(resolve(ROOT, path));
  assert(sha256(content) === expected, `Checksum mismatch: ${path}`);
}

const snapshotText = await text("data/raw/final-snapshot.json");
const manifestText = await text("data/raw/final-manifest.json");
const snapshot = JSON.parse(snapshotText);
const config = JSON.parse(await text("data/raw/migration-config.json"));
const hardwired = JSON.parse(await text("data/raw/hardwired-cutoff.json"));
const market = JSON.parse(await text("data/markets/summary.json"));

assert(
  sha256(snapshotText) === config.snapshotSha256,
  "Committed full snapshot SHA-256 mismatch",
);
assert(
  sha256(manifestText) === config.manifestSha256,
  "Committed manifest SHA-256 mismatch",
);
assert(
  snapshot.meta.merkleRoot.toLowerCase() === config.snapshotRoot.toLowerCase(),
  "Merkle root mismatch",
);
assert(snapshot.leaves.length === 4_307, "Expected 4,307 leaves");
assert(snapshot.meta.accountCount === 734, "Expected 734 accounts");

const kinds = new Map();
const assignedIds = new Set();
const recomputedLeaves = [];
let reserve = 0n;
for (const leaf of snapshot.leaves) {
  const recomputedLeaf = recomputeLeaf(snapshot.meta, leaf);
  assert(recomputedLeaf === leaf.leaf, `Leaf mismatch: ${leaf.leaf}`);
  recomputedLeaves.push(recomputedLeaf);
  kinds.set(leaf.kind, (kinds.get(leaf.kind) ?? 0) + 1);
  reserve += BigInt(leaf.amount) + (leaf.kind === 2 ? 10n ** 18n : 0n);
  if (leaf.kind === 1 || leaf.kind === 2 || leaf.kind === 4) {
    assert(!assignedIds.has(leaf.v2Id), `Duplicate V2 ID: ${leaf.v2Id}`);
    assignedIds.add(leaf.v2Id);
  }
}
assert(kinds.get(1) === 1_425, "Expected 1,425 dark allocations");
assert(kinds.get(2) === 2_001, "Expected 2,001 hardwired allocations");
assert(kinds.get(3) === 521, "Expected 521 fractional allocations");
assert(kinds.get(4) === 360, "Expected 360 restitution allocations");
assert(
  recomputeRoot(recomputedLeaves) === snapshot.meta.merkleRoot,
  "Recomputed Merkle root mismatch",
);
assert(
  reserve === BigInt(config.migrationReserveWei),
  "Migration reserve does not equal allocation sum",
);
assert(
  hardwired.meta.eligibleLitCopies === 2_001,
  "Expected 2,001 eligible lit copies",
);
assert(
  hardwired.meta.postLiquidCutoffHardwires === 15,
  "Expected 15 post-liquid-cutoff hardwires",
);

assert(
  dataRows(await text("data/migration/terminal-id-mapping.csv")) === 3_426,
  "Terminal mapping row count mismatch",
);
assert(
  dataRows(await text("data/migration/fractional-balances.csv")) === 521,
  "Fractional row count mismatch",
);
assert(
  dataRows(await text("data/migration/restitution-mapping.csv")) === 360,
  "Restitution row count mismatch",
);
assert(
  dataRows(
    await text("data/migration/post-liquid-cutoff-hardwires.csv"),
  ) === 15,
  "Post-cutoff hardwire row count mismatch",
);

assert(market.totals.listedPools === 30, "Expected 30 indexed pools");
assert(market.totals.canonicalPools === 10, "Expected 10 canonical pools");
assert(
  market.totals.canonicalPostCutoffSwaps === 0,
  "Canonical post-cutoff swaps must be zero",
);
assert(market.totals.externalPools === 20, "Expected 20 external pools");
assert(
  market.totals.externalPoolsActiveAfterCutoff === 9,
  "Expected 9 active external pools",
);
assert(
  dataRows(
    await text("data/markets/external-pool-post-cutoff-swaps.csv"),
  ) === market.totals.externalPostCutoffSwaps,
  "External swap ledger count mismatch",
);

console.log(
  `Evidence verified: ${snapshot.leaves.length} allocations, `
    + `${market.totals.listedPools} pools, `
    + `${market.totals.externalPostCutoffSwaps} external post-cutoff swaps.`,
);
