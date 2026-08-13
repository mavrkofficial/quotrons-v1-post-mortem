#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = resolve(ROOT, "data/markets");
const RPC_URL =
  process.env.ROBINHOOD_RPC_URL
  ?? "https://rpc.mainnet.chain.robinhood.com";
const DEXSCREENER_URL =
  "https://api.dexscreener.com/latest/dex/tokens/"
  + "0x40686524e56AfF0F1446958725dCF6e6dA5381E6";
const CHAIN_ID = 4663;
const QUOTRON = "0x40686524e56aff0f1446958725dcf6e6da5381e6";
const POOL_MANAGER = "0x8366a39cc670b4001a1121b8f6a443a643e40951";
const FLOOR_HOOK = "0x5a7d914597476393794e100ddd8b70f8c3f570cc";
const CUTOFF_BLOCK = 34_984_482n;
const BLOCK_CHUNK = 5_000n;
const V4_SWAP_TOPIC =
  "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";
const V3_SWAP_TOPIC =
  "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67";
const FLOOR_OF_SELECTOR = "0x226f9a55";
const CANONICAL_FLOORS = [
  "NVDA",
  "AAPL",
  "TSLA",
  "GME",
  "SPCX",
  "SPY",
  "PLTR",
  "NFLX",
  "RDDT",
  "MSTR",
];

let rpcId = 0;

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function fetchJson(url, options = {}, attempts = 7) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`${response.status} ${await response.text()}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        await sleep(Math.min(30_000, 750 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

async function rpc(method, params) {
  const payload = {
    jsonrpc: "2.0",
    id: ++rpcId,
    method,
    params,
  };
  const response = await fetchJson(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (response.error) {
    throw new Error(`${method}: ${JSON.stringify(response.error)}`);
  }
  return response.result;
}

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function tokenOtherThanQuotron(pair) {
  return normalize(pair.baseToken.address) === QUOTRON
    ? pair.quoteToken
    : pair.baseToken;
}

function signedWord(word) {
  const unsigned = BigInt(word);
  return unsigned >= 1n << 255n ? unsigned - (1n << 256n) : unsigned;
}

function words(data) {
  return data
    .slice(2)
    .match(/.{64}/g)
    ?.map((word) => `0x${word}`) ?? [];
}

function formatUnits(value, decimals = 18) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const divisor = 10n ** BigInt(decimals);
  const whole = absolute / divisor;
  const fractional = (absolute % divisor)
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fractional ? `.${fractional}` : ""}`;
}

function csvCell(value) {
  const string = String(value ?? "");
  return /[",\n]/.test(string)
    ? `"${string.replaceAll('"', '""')}"`
    : string;
}

function csv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => csvCell(row[column])).join(",")
    ),
    "",
  ].join("\n");
}

async function getLogs(address, topics, fromBlock, toBlock) {
  const logs = [];
  for (
    let start = fromBlock;
    start <= toBlock;
    start += BLOCK_CHUNK
  ) {
    const end = start + BLOCK_CHUNK - 1n > toBlock
      ? toBlock
      : start + BLOCK_CHUNK - 1n;
    const chunk = await rpc("eth_getLogs", [{
      address,
      fromBlock: `0x${start.toString(16)}`,
      toBlock: `0x${end.toString(16)}`,
      topics,
    }]);
    logs.push(...chunk);
    await sleep(80);
  }
  return logs;
}

async function main() {
  const capturedAt = new Date().toISOString();
  const [dexData, latestHex] = await Promise.all([
    fetchJson(DEXSCREENER_URL),
    rpc("eth_blockNumber", []),
  ]);
  const latestBlock = BigInt(latestHex);
  const allPairs = (dexData.pairs ?? [])
    .filter((pair) =>
      normalize(pair.baseToken?.address) === QUOTRON
      || normalize(pair.quoteToken?.address) === QUOTRON
    );

  const pairs = allPairs.map((pair) => {
    const other = tokenOtherThanQuotron(pair);
    const otherAddress = normalize(other.address);
    return {
      pool_id_or_address: normalize(pair.pairAddress),
      dex: pair.dexId,
      labels: (pair.labels ?? []).join("|"),
      quote_symbol: other.symbol,
      quote_address: otherAddress,
      canonical: false,
      canonical_floor: "",
      pair_created_at: pair.pairCreatedAt
        ? new Date(pair.pairCreatedAt).toISOString()
        : "",
      liquidity_usd_at_capture: pair.liquidity?.usd ?? "",
      volume_6h_usd_at_capture: pair.volume?.h6 ?? "",
      dexscreener_url: pair.url,
      post_cutoff_swap_events: 0,
      post_cutoff_quotron_turnover_wei: 0n,
    };
  });

  const pairById = new Map(
    pairs.map((pair) => [pair.pool_id_or_address, pair]),
  );
  const v4PoolIds = pairs
    .filter(({ labels }) => labels.split("|").includes("v4"))
    .map(({ pool_id_or_address }) => pool_id_or_address);
  const v3PairAddresses = pairs
    .filter(({ labels }) => !labels.split("|").includes("v4"))
    .map(({ pool_id_or_address }) => pool_id_or_address);

  await Promise.all(v4PoolIds.map(async (poolId) => {
    const result = await rpc("eth_call", [{
      to: FLOOR_HOOK,
      data: `${FLOOR_OF_SELECTOR}${poolId.slice(2)}`,
    }, "latest"]);
    const floorIndex = Number(BigInt(result));
    if (floorIndex > 0) {
      const pair = pairById.get(poolId);
      pair.canonical = true;
      pair.canonical_floor = CANONICAL_FLOORS[floorIndex - 1] ?? floorIndex;
    }
  }));

  const [v4Logs, v3Logs] = await Promise.all([
    v4PoolIds.length
      ? getLogs(
          POOL_MANAGER,
          [V4_SWAP_TOPIC, v4PoolIds],
          CUTOFF_BLOCK,
          latestBlock,
        )
      : [],
    v3PairAddresses.length
      ? getLogs(
          v3PairAddresses,
          [V3_SWAP_TOPIC],
          CUTOFF_BLOCK,
          latestBlock,
        )
      : [],
  ]);

  const swapRows = [];
  for (const log of v4Logs) {
    const poolId = normalize(log.topics[1]);
    const pair = pairById.get(poolId);
    if (!pair) continue;
    const values = words(log.data);
    const amount0 = signedWord(values[0]);
    const amount1 = signedWord(values[1]);
    const quotronIsCurrency0 =
      BigInt(QUOTRON) < BigInt(pair.quote_address);
    const quotronDelta = quotronIsCurrency0 ? amount0 : amount1;
    const turnover = quotronDelta < 0n ? -quotronDelta : quotronDelta;
    pair.post_cutoff_swap_events += 1;
    pair.post_cutoff_quotron_turnover_wei += turnover;
    swapRows.push({
      block_number: BigInt(log.blockNumber).toString(),
      transaction_hash: log.transactionHash,
      transaction_index: Number(BigInt(log.transactionIndex)),
      log_index: Number(BigInt(log.logIndex)),
      pool_id_or_address: poolId,
      quote_symbol: pair.quote_symbol,
      direction: quotronDelta > 0n ? "sell-quotron" : "buy-quotron",
      quotron_amount_wei: turnover.toString(),
      quotron_amount: formatUnits(turnover),
    });
  }

  for (const log of v3Logs) {
    const pairAddress = normalize(log.address);
    const pair = pairById.get(pairAddress);
    if (!pair) continue;
    const values = words(log.data);
    const amount0 = signedWord(values[0]);
    const amount1 = signedWord(values[1]);
    const quotronIsToken0 = BigInt(QUOTRON) < BigInt(pair.quote_address);
    const quotronDelta = quotronIsToken0 ? amount0 : amount1;
    const turnover = quotronDelta < 0n ? -quotronDelta : quotronDelta;
    pair.post_cutoff_swap_events += 1;
    pair.post_cutoff_quotron_turnover_wei += turnover;
    swapRows.push({
      block_number: BigInt(log.blockNumber).toString(),
      transaction_hash: log.transactionHash,
      transaction_index: Number(BigInt(log.transactionIndex)),
      log_index: Number(BigInt(log.logIndex)),
      pool_id_or_address: pairAddress,
      quote_symbol: pair.quote_symbol,
      direction: quotronDelta > 0n ? "sell-quotron" : "buy-quotron",
      quotron_amount_wei: turnover.toString(),
      quotron_amount: formatUnits(turnover),
    });
  }

  const catalogRows = pairs
    .map((pair) => ({
      ...pair,
      post_cutoff_quotron_turnover_wei:
        pair.post_cutoff_quotron_turnover_wei.toString(),
      post_cutoff_quotron_turnover: formatUnits(
        pair.post_cutoff_quotron_turnover_wei,
      ),
      migration_treatment: pair.canonical
        ? "liquid-snapshot-fixed-at-cutoff"
        : "post-cutoff-trades-excluded",
    }))
    .sort((a, b) =>
      Number(b.canonical) - Number(a.canonical)
      || b.post_cutoff_swap_events - a.post_cutoff_swap_events
      || a.pool_id_or_address.localeCompare(b.pool_id_or_address)
    );
  const canonicalRows = catalogRows.filter(({ canonical }) => canonical);
  const externalRows = catalogRows.filter(({ canonical }) => !canonical);
  const externalActive = externalRows.filter(
    ({ post_cutoff_swap_events }) => post_cutoff_swap_events > 0,
  );
  const externalTurnover = externalRows.reduce(
    (total, row) =>
      total + BigInt(row.post_cutoff_quotron_turnover_wei),
    0n,
  );

  const summary = {
    schema: "quotrons-v1-post-mortem-market-catalog-v1",
    capturedAt,
    chainId: CHAIN_ID,
    quotron: QUOTRON,
    poolManager: POOL_MANAGER,
    floorHook: FLOOR_HOOK,
    cutoffBlock: CUTOFF_BLOCK.toString(),
    scannedThroughBlock: latestBlock.toString(),
    source: {
      pairDiscovery: DEXSCREENER_URL,
      immutableActivity: "Robinhood Chain eth_getLogs",
      limitation:
        "Pair discovery is limited to pools indexed by DexScreener at capture time.",
    },
    totals: {
      listedPools: catalogRows.length,
      canonicalPools: canonicalRows.length,
      canonicalPostCutoffSwaps: canonicalRows.reduce(
        (total, row) => total + row.post_cutoff_swap_events,
        0,
      ),
      externalPools: externalRows.length,
      externalPoolsActiveAfterCutoff: externalActive.length,
      externalPostCutoffSwaps: externalRows.reduce(
        (total, row) => total + row.post_cutoff_swap_events,
        0,
      ),
      externalPostCutoffQuotronTurnoverWei: externalTurnover.toString(),
      externalPostCutoffQuotronTurnover: formatUnits(externalTurnover),
    },
  };

  const poolColumns = [
    "pool_id_or_address",
    "dex",
    "labels",
    "quote_symbol",
    "quote_address",
    "canonical",
    "canonical_floor",
    "pair_created_at",
    "post_cutoff_swap_events",
    "post_cutoff_quotron_turnover_wei",
    "post_cutoff_quotron_turnover",
    "migration_treatment",
    "liquidity_usd_at_capture",
    "volume_6h_usd_at_capture",
    "dexscreener_url",
  ];
  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(OUTPUT_DIR, "summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    ),
    writeFile(
      resolve(OUTPUT_DIR, "all-listed-pools.csv"),
      csv(catalogRows, poolColumns),
    ),
    writeFile(
      resolve(OUTPUT_DIR, "canonical-pools.csv"),
      csv(canonicalRows, poolColumns),
    ),
    writeFile(
      resolve(OUTPUT_DIR, "external-pools.csv"),
      csv(externalRows, poolColumns),
    ),
    writeFile(
      resolve(OUTPUT_DIR, "external-pool-post-cutoff-swaps.csv"),
      csv(
        swapRows.filter(({ pool_id_or_address }) =>
          !pairById.get(pool_id_or_address)?.canonical
        ),
        [
          "block_number",
          "transaction_hash",
          "transaction_index",
          "log_index",
          "pool_id_or_address",
          "quote_symbol",
          "direction",
          "quotron_amount_wei",
          "quotron_amount",
        ],
      ),
    ),
  ]);
  console.log(JSON.stringify(summary.totals, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
