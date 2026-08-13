# QUOTRONS V1 post-mortem and V2 migration record

This repository is the public, evidence-backed record of the QUOTRONS V1
security incident, containment actions, snapshot policy, V2 allocation plan,
and eventual distribution.

It is intentionally split into narrative documents, machine-readable ledgers,
raw snapshot artifacts, and reproducible scripts. On-chain facts are linked to
Robinhood Chain transactions. Derived claims identify their source and cutoff.
Unknown or incomplete items are marked as pending instead of being inferred.

## Current verified commitments

- Network: Robinhood Chain (`4663`)
- V1 QUOTRON: `0x40686524e56AfF0F1446958725dCF6e6dA5381E6`
- Liquid eligibility cutoff: block `34,984,482`
- Hardwired ownership cutoff: block `35,337,540` (August 13, 2026,
  6:00:00 AM America/Chicago)
- V2 allocation Merkle root:
  `0x1c28b8292e4784ff5cd5209dae8e8667d0648c7748c85ce09b9449af0a1a0cde`
- Allocation leaves: `4,307`
- Recipient accounts: `734`
- Existing dark terminal mappings: `1,425`
- Eligible hardwired terminal mappings: `2,001`
- Fractional allocations: `521`
- Restitution events: `360`
- Newly hardwired after the liquid cutoff and excluded from new lit-copy
  eligibility: `15`

The V2 allocations are a prepared distribution ledger. They do not, by
themselves, prove that V2 assets have been deployed or delivered. Distribution
transaction hashes will be added after execution.

## Read the record

1. [Incident overview](docs/01-incident/overview.md)
2. [Incident timeline and containment transactions](docs/01-incident/timeline.md)
3. [Exploit mechanics](docs/01-incident/exploit-mechanics.md)
4. [Dual-cutoff migration policy](docs/02-migration/snapshot-policy.md)
5. [Hardwired and dark terminal mapping](docs/02-migration/terminal-mapping.md)
6. [Restitution methodology](docs/02-migration/restitution.md)
7. [Canonical pool shutdown](docs/03-markets/canonical-pools.md)
8. [External pool activity and exclusion](docs/03-markets/external-pools.md)
9. [V2 security changes](docs/04-v2/security-changes.md)
10. [V2 deployment and distribution record](docs/04-v2/deployment-and-distribution.md)
11. [Reproduce and verify the evidence](docs/05-verification/reproduce.md)

## Machine-readable evidence

- `data/contracts/v1.json` — V1 contracts, published roles, and incident
  identifiers
- `data/raw/final-snapshot.json` — full allocation leaves and proofs
- `data/raw/final-manifest.json` — per-account public allocation manifest
- `data/raw/hardwired-cutoff.json` — terminal ownership at the announced
  hardwired cutoff
- `data/migration/terminal-id-mapping.csv` — V1 to V2 terminal IDs and
  recipients
- `data/migration/fractional-balances.csv` — liquid fractional allocations
- `data/migration/restitution-mapping.csv` — incident-by-incident restitution
- `data/migration/post-liquid-cutoff-hardwires.csv` — 15 later hardwires and
  their treatment
- `data/markets/canonical-pools.csv` — ten official pools
- `data/markets/external-pools.csv` — twenty DexScreener-indexed external pools
- `data/markets/external-pool-post-cutoff-swaps.csv` — immutable post-cutoff
  swap events and transaction hashes
- `data/transactions/mitigation.csv` — owner containment and fund-preservation
  transactions

Wallet addresses in these files are public blockchain identifiers. This
repository does not identify the natural persons behind them.

## Evidence labels

- **On-chain**: directly reproducible from Robinhood Chain state, receipts, or
  logs.
- **Committed**: covered by the published block hashes, Merkle root, and
  SHA-256 files.
- **Derived**: generated deterministically from committed or on-chain data.
- **Market-indexed**: pool discovery depends on DexScreener's indexed set at
  the stated capture time; swap logs for discovered pools remain on-chain.
- **Pending**: not yet executed or independently finalized.

## Status

The snapshot and migration ledgers are generated and internally verified. V2
deployment, distribution receipts, and final independent security-review
reports are pending and will be added without rewriting the historical V1
record.
