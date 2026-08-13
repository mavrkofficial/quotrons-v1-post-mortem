# Incident overview

## Summary

QUOTRONS V1 used a hybrid ERC-20/ERC-721 design. Whole-token ownership and
terminal NFT ownership were linked, but they could change through more than one
internal path.

The incident was caused by an approval-lifecycle defect. A terminal-level
approval could survive an ownership change initiated through the ERC-20 side of
the system. If that terminal ID later moved to another holder, the old approval
could still authorize a transfer from the new holder. The observed exploit
contract repeatedly used those stale approvals to move terminals without the
current holder granting a new approval or receiving payment.

This did not constitute a general ability to transfer arbitrary assets from a
wallet. It affected QUOTRONS terminal assets whose V1 approval state had become
stale.

## Immediate response

The response had four stages:

1. Identify the exploit contract, operator, transfer path, and runtime
   codehash.
2. Ban the observed exploit runtime codehash at the V1 token level.
3. Redirect V1's authorized hook to a dead address, stopping the ten registered
   canonical pools.
4. Disable transaction actions in the official frontend and begin an
   immutable-chain reconciliation.

The codehash ban and official-pool shutdown were successful for their stated
scope. V1 did not contain a safe global pause and did not bind PoolManager
authorization to one registered pool and router. As a result, noncanonical
pools could still settle trades through the same PoolManager. The migration
policy therefore freezes liquid eligibility at the official-pool shutdown
block rather than at the later hardwired NFT cutoff.

## Scope and accounting

The final incident ledger records `360` observed transfers into the exploit
contract. Those are event-level restitution records; the same terminal ID can
appear more than once after being transferred, recycled, and reassigned.
Event count, unique terminal count, and unique victim count are therefore
different measurements and must not be used interchangeably.

The final migration ledger contains:

- `1,425` existing dark-terminal allocations;
- `2,001` eligible hardwired-terminal allocations;
- `521` fractional-balance allocations; and
- `360` event-level restitution allocations.

The raw events, recipients, transaction hashes, and replacement decisions are
published in `data/migration/restitution-mapping.csv`.

## What this report does not claim

- It does not claim V1 was globally paused. Only the ten registered canonical
  pools recorded zero swaps after the cutoff.
- It does not treat current ownership of a wallet or pool position as evidence
  of wrongdoing.
- It does not infer a person's identity from a blockchain address.
- It does not claim V2 is exploit-proof. V2 launch remains gated on testing,
  fork validation, economic simulation, and security review.
