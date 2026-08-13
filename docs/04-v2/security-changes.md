# V2 security changes and trust disclosures

This document describes the prepared V2 design. It is not a deployment
attestation. Contract addresses, source commit, bytecode hashes, and deployment
transactions will be added after launch gates pass.

## Approval lifecycle

V2 clears token-specific terminal approval on every ownership change,
regardless of whether ownership changes through the NFT mirror, fungible-token
movement, migration, pool settlement, or authorized recovery.

Tests cover the direct V1 failure mode: a previously approved address cannot
transfer an ID after that ID changes owner through a different path.

## Canonical pool routing

V2 uses one QUOTRON/WETH market and a dedicated router/hook pair.

PoolManager transfers are permitted only when:

- the hook's registered pool ID matches;
- the canonical router initiated the expected path;
- authorization specifies send or receive direction;
- authorization specifies the exact amount; and
- transaction-scoped transient authorization is consumed.

Separate transient slots are used for inbound and outbound authorization to
avoid direction confusion or reuse.

## Migration bounds

Migration functions are restricted to the configured migration operator and
the committed allocation root. Exact-ID draws must preserve uniqueness, and
the migration reserve is capped to the published allocation amount:

`3,925.448872639031210668 QUOTRON`

Distribution must reconcile to the committed leaves rather than current V1
wallet state.

## Launch finalization

Prepared V2 launch controls include one-way finalization. Setup-only
permissions and elevated launch configuration cannot remain silently active
after launch. Launch preflight checks reject unresolved setup permissions.

The planned launch phase includes elevated symmetric fees and a keeper
exemption. Those economics require separate simulation and are not represented
as completed in this post-mortem until deployed transactions and test results
are published.

## Emergency authority

V2 intentionally includes disclosed emergency controls:

- a guardian can blacklist an address;
- the recovery Safe can blacklist or unblacklist;
- the recovery Safe can move QUOTRON or a terminal from one wallet to a
  specified recipient; and
- protected protocol accounts cannot be blacklisted or used as unsafe recovery
  destinations.

Launch requires the recovery administrator to be a deployed Safe with a
threshold of at least two. The prepared configuration uses a 2-of-2 Safe.

These powers reduce incident-response time but introduce governance and custody
risk. They are not described as decentralization. Final Safe address, owners,
threshold, and executed actions must remain public.

## Creator earnings

The prepared mirror supports ERC721-C transfer validation and ERC-2981 royalty
reporting. The configured royalty is `5%`, paid to an immutable splitter:

- `4%` of sale value to the keeper; and
- `1%` of sale value to the creator.

Enforcement depends on marketplace compatibility and the configured external
transfer validator. The validator address and code must be verified before
launch.

## Security gate

V2 should not launch solely because these controls exist. Required evidence
includes:

- unit and regression tests;
- fuzz and invariant tests;
- live-chain fork tests;
- launch-fee and liquidity economic simulations;
- deployment/configuration preflight;
- independent security review; and
- bytecode/source verification after deployment.

Any failed critical gate is a no-go condition.
