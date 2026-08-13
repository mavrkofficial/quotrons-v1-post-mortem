# External pools and migration exclusion

## Catalog result

At the August 13, 2026, 7:04 AM Central capture, DexScreener indexed `30`
pools for the real V1 QUOTRON contract:

- `10` on-chain hook-registered canonical pools; and
- `20` external pools.

From liquid cutoff block `34,984,482` through scan block `35,376,243`:

- `9` external pools recorded post-cutoff swaps;
- `11` external pools recorded none;
- the active external pools emitted `562` swap events; and
- gross QUOTRON turnover was `276.784368824010543604`.

Gross turnover is the sum of the absolute QUOTRON amount in each swap. The same
token can be counted more than once as it changes hands, so turnover is not a
unique-token or unique-buyer count.

## Published records

- `data/markets/external-pools.csv` catalogs all twenty indexed external pools,
  quote assets, creation timestamps, activity, and capture-time market data.
- `data/markets/external-pool-post-cutoff-swaps.csv` lists every measured
  post-cutoff swap event with pool ID, block, transaction hash, direction, and
  QUOTRON amount.
- `data/markets/summary.json` records the cutoff, scan endpoint, source, and
  aggregate totals.

## Migration treatment

External-pool transactions after block `34,984,482` do not create or move V2
liquid entitlement. The migration ledger uses balances and dark ownership at
the cutoff block.

This is an eligibility rule, not a claim that every external-pool participant
acted maliciously. Participants could have traded through an interface without
understanding V1's routing limitation. The rule applies uniformly because
official liquid trading had already been stopped and publicly treated as
closed.

## Why the pools could still trade

V1 authorized transfers involving the shared PoolManager, but its authorization
was not safely bound to:

- one registered pool ID;
- the official router;
- a transfer direction;
- an exact amount; and
- one transaction-scoped authorization.

A separately initialized pool could therefore settle through PoolManager
without using the registered floor hook.

## Discovery limitation

Pool discovery is limited to the DexScreener-indexed set returned at capture
time. The swap events for those pools are immutable chain data, but the
statement “twenty external pools” is an index-scoped observation rather than a
proof that no unindexed pool existed.

Capture-time liquidity and volume fields are mutable context and are not used
to compute V2 entitlement.
