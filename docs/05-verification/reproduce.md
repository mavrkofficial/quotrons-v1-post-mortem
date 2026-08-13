# Reproduce and verify the evidence

## Verify the committed repository data

Requirements:

- Node.js 20 or newer
- npm

Run:

```sh
npm ci
npm run verify
```

The verifier:

- checks every file listed in `SHA256SUMS`;
- verifies the raw snapshot and manifest hashes against
  `migration-config.json`;
- recomputes every ABI-encoded allocation leaf;
- recomputes the Merkle root;
- rejects duplicate assigned V2 terminal IDs;
- confirms the migration reserve equals the sum of all allocation amounts;
- verifies migration ledger row counts; and
- reconciles the external-pool event ledger with its summary.

`npm audit` reported zero known dependency vulnerabilities when this record was
prepared.

## Rebuild migration projections from the QUOTRONS source repository

The ledger builder expects the main `Quotrons` repository to be a sibling of
this repository by default. Override it with `QUOTRONS_SOURCE` if needed.

```sh
npm run build:migration
npm run checksums
npm run verify
```

This copies the committed raw artifacts and deterministically rebuilds:

- terminal ID mappings;
- fractional allocations;
- restitution mappings; and
- post-liquid-cutoff hardwire treatment.

## Rebuild transaction receipts

```sh
npm run build:transactions
npm run checksums
npm run verify
```

Set `ROBINHOOD_RPC_URL` to use a different Robinhood Chain RPC endpoint. The
script fetches each transaction, receipt, and block and checks the expected
destination.

## Rebuild the market catalog

```sh
npm run build:markets
```

This performs live pool discovery and then reads immutable swap logs. A later
run can legitimately differ because:

- DexScreener may index additional pools;
- capture-time liquidity and volume change; and
- post-cutoff external pools may continue to emit swaps.

For that reason, the committed CSVs and `data/markets/summary.json` retain a
specific capture timestamp and scan endpoint. If the market catalog is
refreshed, its summary, checksums, and narrative totals must be reviewed
together before publication.

## Independent chain checks

Reviewers should use any Robinhood Chain archive-capable RPC to confirm:

- block `34,984,482` hash
  `0xfbe4be5a06e1c2af4d3b64d2e16ca421dadf962a849dd8aca86fd1706fbb882d`;
- block `35,337,540` hash
  `0x85a3668228eb45a92d4b41e042ba15058978924fe279808004ff891216250eb4`;
- the containment receipts in `data/transactions/mitigation.csv`; and
- PoolManager swap logs listed in
  `data/markets/external-pool-post-cutoff-swaps.csv`.

No private RPC credentials, signing keys, or nonpublic wallet information are
required.
