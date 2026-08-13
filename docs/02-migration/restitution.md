# Restitution methodology

## Event-level accounting

The reconciliation found:

- `360` transfers into the observed exploit contract;
- `333` unique original terminal IDs; and
- `90` unique source addresses.

Restitution is event-based. A terminal ID could be transferred into the
contract, returned to circulation, assigned to another wallet, and transferred
again. Counting only unique IDs would omit later independently affected source
addresses.

Every included event records its source address, original terminal ID, block,
transaction hash, and replacement decision in
`data/migration/restitution-mapping.csv`.

## Allocation rule

Each included event receives one planned dark-terminal allocation.

The replacement decision follows this order:

1. Use the original terminal ID if doing so does not collide with a base
   snapshot allocation or an earlier restitution allocation.
2. Otherwise, select an unused terminal with the same floor and tier.
3. If no same-floor, same-tier terminal remains, select an unused terminal with
   the same tier on another floor.

The final result is:

- `227` exact-ID restitutions;
- `132` same-floor, same-tier replacements; and
- `1` same-tier, cross-floor replacement.

## Collision reasons

Of the `133` replacements:

- `117` protect an existing pause-block holder's exact-ID allocation; and
- `16` resolve a repeated incident ID that had already received a restitution
  assignment.

This prevents restitution from taking an exact terminal allocation away from a
holder independently entitled under the snapshot.

## Exclusions

The allocation builder excludes protocol custody addresses and the identified
incident contract/operator from receiving ordinary migration entitlement.
Post-liquid-cutoff external-pool activity also does not create new entitlement.

An address appearing in an on-chain transfer or market ledger is not, by
itself, classified as malicious. Exclusion decisions must be tied to the
published deterministic policy, not social-media allegations or wallet
appearance.

## Audit trail

The raw full snapshot contains each restitution leaf and Merkle proof.
The CSV is a human-reviewable projection. Reviewers should confirm:

- every included incident transaction exists and succeeded;
- its source, destination, ID, and block match the chain;
- the assigned V2 ID is unique across base and restitution allocations;
- replacement floor/tier policy is followed; and
- the CSV row is represented by a committed Merkle leaf.
