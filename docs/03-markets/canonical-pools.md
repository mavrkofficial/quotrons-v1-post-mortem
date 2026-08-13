# Canonical pool shutdown

## Canonical set

V1 registered ten official stock-denominated pools through
`QuotronFloorHook.floorOf(poolId)`. The floors were:

`NVDA`, `AAPL`, `TSLA`, `GME`, `SPCX`, `SPY`, `PLTR`, `NFLX`, `RDDT`, and
`MSTR`.

The exact pool IDs, quote-token addresses, discovery metadata, and post-cutoff
log counts are published in `data/markets/canonical-pools.csv`.

## One control transaction, not ten pause transactions

The canonical pools were not paused through ten independent per-pool calls.
V1 exposed a shared routing configuration. At block `34,984,482`, transaction
[`0xe250…d7f6`](https://robinhoodchain.blockscout.com/tx/0xe250bed652711301eafd807d537dd44b5356482e8333553af2421c4eddccd7f6)
redirected the V1 authorized hook to the dead address.

That single transaction disabled the registered routing path used by all ten
canonical pools.

## Verification

The market catalog:

1. discovers pools indexed for the real V1 QUOTRON address;
2. identifies canonical V4 pool IDs by querying the V1 hook's on-chain
   `floorOf(poolId)` registry;
3. scans PoolManager `Swap` logs from block `34,984,482`; and
4. attributes each event by indexed pool ID.

Result through scan block `35,376,243`:

- canonical pools: `10`;
- post-cutoff canonical swap events: `0`; and
- post-cutoff canonical QUOTRON turnover: `0`.

This supports the precise statement: **all ten registered canonical pools
stopped trading at the cutoff**.

It does not support the broader statement that all V1 trading stopped.
External pools remained possible because V1 lacked a safe global pause and
pool-specific authorization.
