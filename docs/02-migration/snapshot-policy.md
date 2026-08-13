# Dual-cutoff snapshot policy

One cutoff could not fairly represent both V1 liquid trading and V1 hardwired
NFT trading.

Official liquid trading was stopped on August 12, but holders were told that
eligible hardwired terminals could continue to trade on secondary markets until
6:00 AM Central Time on August 13. V1's external-pool weakness also allowed a
small amount of liquid trading after the official pool shutdown.

The final ledger therefore uses two cutoffs.

## 1. Liquid eligibility cutoff

- Block: `34,984,482`
- Block hash:
  `0xfbe4be5a06e1c2af4d3b64d2e16ca421dadf962a849dd8aca86fd1706fbb882d`
- Timestamp: August 12, 2026, 8:09:32 PM America/Chicago

This block fixes:

- dark terminal ownership;
- whole liquid QUOTRON allocations;
- fractional QUOTRON balances;
- the set of terminals eligible to receive lit copies; and
- the base ownership used during incident reconciliation.

Purchases, sales, transfers, and newly created liquid positions after this block
do not create or move V2 liquid entitlement. This applies regardless of which
external pool or interface processed the transaction.

## 2. Eligible hardwired ownership cutoff

- Block: `35,337,540`
- Block hash:
  `0x85a3668228eb45a92d4b41e042ba15058978924fe279808004ff891216250eb4`
- Timestamp: August 13, 2026, 6:00:00 AM America/Chicago

Exactly `2,001` terminals were already hardwired at the liquid cutoff. Only
those IDs receive V2 lit copies. For those IDs, V2 recipient ownership follows
the later hardwired snapshot, allowing voluntary secondary-market transfers
before the announced deadline to be honored.

## Terminals hardwired between cutoffs

V1's hardwired count increased from `2,001` to `2,016` between the cutoffs.
Those `15` later hardwires do not create new V2 lit-copy entitlement:

- `8` preserve the dark allocation and owner already fixed at the liquid
  cutoff; and
- `7` were not held as eligible dark terminals at the liquid cutoff and receive
  no allocation from the later hardwire.

The terminal-by-terminal treatment is published in
`data/migration/post-liquid-cutoff-hardwires.csv`.

## Why post-cutoff external-pool purchases are excluded

The official shutdown stopped all ten canonical pools, but did not globally
disable V1 transfers or external PoolManager pools. Honoring later external-pool
purchases would:

- move entitlement away from holders fixed at the announced official shutdown;
- reward trading through an unintended route after incident controls were
  announced; and
- create an inconsistent cutoff dependent on which interface a person used.

The policy does not label every post-cutoff buyer as malicious. It states only
that those transactions do not change the V2 allocation.

## Commitments

- Merkle root:
  `0x1c28b8292e4784ff5cd5209dae8e8667d0648c7748c85ce09b9449af0a1a0cde`
- Full snapshot SHA-256:
  `c00336aeaef8a68aa918fbb0dfec39b8001522f8e2dd60e32cb958632d9d3fa3`
- Manifest SHA-256:
  `ba663339dc2ad0678f229b384ffaad40383ca5b22652dcd327f73c07f1ee2f7a`
- Canonical snapshot hash:
  `242d2fa47b15405bfeca47cb4674199132660dba98cbb79608c5afa6817147b9`

The raw committed files are under `data/raw/`.
