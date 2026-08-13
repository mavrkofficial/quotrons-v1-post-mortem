# V2 deployment and distribution record

Status: **pending**

This file will become the transaction-level handoff from the committed
migration plan to executed V2 state. It must not be marked complete until each
item can be verified independently on Robinhood Chain.

## Deployment evidence to add

- source repository commit;
- compiler and optimizer settings;
- deployment transaction for each V2 contract;
- deployed address and runtime bytecode hash;
- constructor arguments;
- verified-source link;
- owner, guardian, recovery Safe, Safe owners, and Safe threshold;
- configured creator-earnings validator and royalty splitter;
- canonical QUOTRON/WETH pool ID, hook, and router;
- migration Merkle root and reserve cap; and
- launch finalization transaction.

## Distribution evidence to add

- keeper acquisition transactions;
- reserve-funding transaction;
- each zero-action distribution batch transaction;
- batch index and covered leaf range;
- number and amount of successful allocations;
- any failed or retried recipient;
- delivered hardwired terminal IDs;
- delivered dark terminal IDs;
- delivered fractional balances;
- delivered restitution IDs; and
- final unused-reserve disposition.

## Required reconciliation

The completed record must prove:

1. every delivered allocation corresponds to one committed leaf;
2. no leaf was delivered twice;
3. no V2 terminal ID was assigned twice;
4. the actual recipient and state match the published mapping;
5. total distribution does not exceed
   `3,925.448872639031210668 QUOTRON`; and
6. any deviation is documented with its transaction history and correction.

Until those receipts are published, files under `data/migration/` describe
planned committed allocations rather than completed delivery.
