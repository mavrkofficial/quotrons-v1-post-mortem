# Hardwired and dark terminal mapping

The complete base terminal mapping is
`data/migration/terminal-id-mapping.csv`.

Each row contains:

- V1 terminal ID;
- planned V2 terminal ID;
- recipient wallet;
- V2 state (`dark` or `hardwired`);
- the cutoff block that determines ownership; and
- the committed Merkle leaf.

## Hardwired terminals

`2,001` terminals were already hardwired at liquid cutoff block `34,984,482`.
Each receives the same terminal ID in the planned V2 ledger and remains
hardwired. Recipient ownership follows V1 through hardwired cutoff block
`35,337,540`.

Therefore, for every base hardwired row:

`v1_terminal_id == v2_terminal_id`

Voluntary transfers of these eligible hardwired NFTs before the announced
6:00 AM Central cutoff are reflected in the recipient column.

## Dark terminals

`1,425` dark terminals receive base V2 allocations. Ownership is fixed at
liquid cutoff block `34,984,482`, and each base dark allocation preserves its
terminal ID:

`v1_terminal_id == v2_terminal_id`

Later V1 external-pool trades, token transfers, or hardwire actions do not move
these allocations.

## Fractional balances

Balances below one whole QUOTRON do not have a terminal ID. The `521`
fractional allocations are published separately in
`data/migration/fractional-balances.csv`, in wei.

## Restitution is separate

The base mapping does not overwrite an innocent snapshot holder to restore an
earlier incident event. Restitution is represented by a separate allocation:

- `227` restitution events recover the original ID;
- `132` use a same-floor, same-tier replacement; and
- `1` uses a same-tier, cross-floor replacement because no clean same-floor
  capacity remained.

See `data/migration/restitution-mapping.csv` for each decision.

## Reward balances

This terminal-ID ledger does not itself transfer or extinguish V1 accrued
hardwired rewards. V1 reward claims and any V2 legacy credit transactions must
be accounted for separately. Distribution receipts will be added after
execution; until then, no reward movement should be inferred from this CSV.

## Distribution status

These rows are committed planned allocations, not transaction receipts. After
V2 distribution, this repository will add:

- V2 contract addresses;
- distribution batch transaction hashes;
- per-row delivery status; and
- a reconciliation between planned recipient, actual recipient, and delivered
  terminal state.
