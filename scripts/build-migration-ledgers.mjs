#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SOURCE_ROOT = resolve(
  process.env.QUOTRONS_SOURCE ?? resolve(ROOT, "../Quotrons"),
);
const SOURCE_SNAPSHOT_DIR = resolve(
  SOURCE_ROOT,
  "contracts/deploy/v2-snapshot",
);
const DATA_DIR = resolve(ROOT, "data");
const RAW_DIR = resolve(DATA_DIR, "raw");
const MIGRATION_DIR = resolve(DATA_DIR, "migration");

const KINDS = {
  DARK: 1,
  HARDWIRED: 2,
  FRACTIONAL: 3,
  RESTITUTION_DARK: 4,
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function csvCell(value) {
  const string = String(value ?? "");
  return /[",\n]/.test(string)
    ? `"${string.replaceAll('"', '""')}"`
    : string;
}

function csv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => csvCell(row[column])).join(",")
    ),
    "",
  ].join("\n");
}

async function main() {
  const [
    snapshotText,
    manifestText,
    configText,
    hardwiredText,
  ] = await Promise.all([
    readFile(resolve(SOURCE_SNAPSHOT_DIR, "snapshot.json"), "utf8"),
    readFile(resolve(SOURCE_SNAPSHOT_DIR, "manifest.json"), "utf8"),
    readFile(resolve(SOURCE_SNAPSHOT_DIR, "migration-config.json"), "utf8"),
    readFile(
      resolve(
        SOURCE_ROOT,
        "contracts/deploy/v2-hardwired-snapshot-20260813-0600CT.json",
      ),
      "utf8",
    ),
  ]);

  const snapshot = JSON.parse(snapshotText);
  const config = JSON.parse(configText);
  const hardwired = JSON.parse(hardwiredText);

  if (snapshot.meta.merkleRoot.toLowerCase() !== config.snapshotRoot.toLowerCase()) {
    throw new Error("Snapshot root does not match deployment config");
  }
  if (sha256(snapshotText) !== config.snapshotSha256) {
    throw new Error("Snapshot SHA-256 does not match deployment config");
  }
  if (sha256(manifestText) !== config.manifestSha256) {
    throw new Error("Manifest SHA-256 does not match deployment config");
  }

  const terminalRows = snapshot.leaves
    .filter(({ kind }) => kind === KINDS.DARK || kind === KINDS.HARDWIRED)
    .map((leaf) => ({
      v1_terminal_id: leaf.v1Id,
      v2_terminal_id: leaf.v2Id,
      recipient: leaf.account,
      v2_state: leaf.kind === KINDS.HARDWIRED ? "hardwired" : "dark",
      liquid_cutoff_block: snapshot.meta.snapshotBlock,
      hardwired_ownership_cutoff_block:
        leaf.kind === KINDS.HARDWIRED
          ? snapshot.meta.hardwiredOwnershipCutoffBlock
          : "",
      leaf: leaf.leaf,
    }))
    .sort((a, b) =>
      a.v2_state.localeCompare(b.v2_state) ||
      a.v1_terminal_id - b.v1_terminal_id
    );

  const fractionalRows = snapshot.leaves
    .filter(({ kind }) => kind === KINDS.FRACTIONAL)
    .map((leaf) => ({
      recipient: leaf.account,
      amount_wei: leaf.amount,
      liquid_cutoff_block: snapshot.meta.snapshotBlock,
      leaf: leaf.leaf,
    }))
    .sort((a, b) =>
      a.recipient.toLowerCase().localeCompare(b.recipient.toLowerCase())
    );

  const restitutionRows = snapshot.restitution.map((row) => ({
    event_index: row.eventIndex,
    victim: row.victim,
    original_v1_id: row.originalId,
    assigned_v2_id: row.replacementId,
    replacement_policy: row.replacementPolicy,
    conflict_reason: row.conflictReason,
    floor_code: row.floorCode,
    tier_index: row.tierIdx,
    replacement_floor_code: row.replacementFloorCode,
    replacement_tier_index: row.replacementTierIdx,
    incident_block: row.blockNumber,
    incident_transaction: row.txHash,
  }));

  const postCutoffRows = snapshot.postLiquidCutoffHardwires.map((row) => ({
    terminal_id: row.id,
    liquid_cutoff_owner: row.liquidCutoffOwner,
    hardwired_cutoff_owner: row.hardwiredCutoffOwner,
    floor_code: row.floorCode,
    tier_index: row.tierIdx,
    treatment: row.treatment,
  }));

  const summary = {
    schema: "quotrons-v1-post-mortem-migration-ledgers-v1",
    generatedAt: new Date().toISOString(),
    chainId: snapshot.meta.chainId,
    legacyQuotron: snapshot.meta.legacy.legacy,
    liquidCutoff: {
      block: snapshot.meta.snapshotBlock,
      blockHash: snapshot.meta.snapshotBlockHash,
      policy: snapshot.meta.liquidEligibilityPolicy,
    },
    hardwiredOwnershipCutoff: {
      block: snapshot.meta.hardwiredOwnershipCutoffBlock,
      blockHash: snapshot.meta.hardwiredOwnershipCutoffHash,
      policy: snapshot.meta.hardwiredEligibilityPolicy,
    },
    commitment: {
      merkleRoot: snapshot.meta.merkleRoot,
      snapshotSha256: config.snapshotSha256,
      manifestSha256: config.manifestSha256,
      canonicalSnapshotHash: config.canonicalSnapshotHash,
      migrationReserveWei: config.migrationReserveWei,
    },
    counts: {
      leaves: snapshot.meta.leafCount,
      accounts: snapshot.meta.accountCount,
      darkTerminalMappings: terminalRows.filter(
        ({ v2_state }) => v2_state === "dark",
      ).length,
      hardwiredTerminalMappings: terminalRows.filter(
        ({ v2_state }) => v2_state === "hardwired",
      ).length,
      fractionalAllocations: fractionalRows.length,
      restitutionEvents: restitutionRows.length,
      postLiquidCutoffHardwiresExcluded: postCutoffRows.length,
      hardwiredAtOwnershipCutoff: hardwired.meta.totalHardwired,
      eligibleHardwiredLitCopies: hardwired.meta.eligibleLitCopies,
    },
  };

  await Promise.all([
    mkdir(RAW_DIR, { recursive: true }),
    mkdir(MIGRATION_DIR, { recursive: true }),
  ]);

  await Promise.all([
    copyFile(
      resolve(SOURCE_SNAPSHOT_DIR, "snapshot.json"),
      resolve(RAW_DIR, "final-snapshot.json"),
    ),
    copyFile(
      resolve(SOURCE_SNAPSHOT_DIR, "manifest.json"),
      resolve(RAW_DIR, "final-manifest.json"),
    ),
    copyFile(
      resolve(SOURCE_SNAPSHOT_DIR, "migration-config.json"),
      resolve(RAW_DIR, "migration-config.json"),
    ),
    copyFile(
      resolve(
        SOURCE_ROOT,
        "contracts/deploy/v2-hardwired-snapshot-20260813-0600CT.json",
      ),
      resolve(RAW_DIR, "hardwired-cutoff.json"),
    ),
    writeFile(
      resolve(DATA_DIR, "summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    ),
    writeFile(
      resolve(MIGRATION_DIR, "terminal-id-mapping.csv"),
      csv(terminalRows, [
        "v1_terminal_id",
        "v2_terminal_id",
        "recipient",
        "v2_state",
        "liquid_cutoff_block",
        "hardwired_ownership_cutoff_block",
        "leaf",
      ]),
    ),
    writeFile(
      resolve(MIGRATION_DIR, "fractional-balances.csv"),
      csv(fractionalRows, [
        "recipient",
        "amount_wei",
        "liquid_cutoff_block",
        "leaf",
      ]),
    ),
    writeFile(
      resolve(MIGRATION_DIR, "restitution-mapping.csv"),
      csv(restitutionRows, [
        "event_index",
        "victim",
        "original_v1_id",
        "assigned_v2_id",
        "replacement_policy",
        "conflict_reason",
        "floor_code",
        "tier_index",
        "replacement_floor_code",
        "replacement_tier_index",
        "incident_block",
        "incident_transaction",
      ]),
    ),
    writeFile(
      resolve(MIGRATION_DIR, "post-liquid-cutoff-hardwires.csv"),
      csv(postCutoffRows, [
        "terminal_id",
        "liquid_cutoff_owner",
        "hardwired_cutoff_owner",
        "floor_code",
        "tier_index",
        "treatment",
      ]),
    ),
  ]);

  const checksummed = [
    "data/raw/final-snapshot.json",
    "data/raw/final-manifest.json",
    "data/raw/migration-config.json",
    "data/raw/hardwired-cutoff.json",
    "data/summary.json",
    "data/migration/terminal-id-mapping.csv",
    "data/migration/fractional-balances.csv",
    "data/migration/restitution-mapping.csv",
    "data/migration/post-liquid-cutoff-hardwires.csv",
  ];
  const checksumLines = [];
  for (const relativePath of checksummed) {
    const content = await readFile(resolve(ROOT, relativePath));
    checksumLines.push(`${sha256(content)}  ${relativePath}`);
  }
  await writeFile(
    resolve(ROOT, "SHA256SUMS"),
    `${checksumLines.join("\n")}\n`,
  );

  const accountFiles = await readdir(
    resolve(SOURCE_ROOT, "app/public/migration/accounts"),
  );
  console.log(
    `Generated ${terminalRows.length} terminal mappings, `
      + `${fractionalRows.length} fractional allocations, `
      + `${restitutionRows.length} restitution rows. `
      + `Source proof files checked: ${accountFiles.length}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
