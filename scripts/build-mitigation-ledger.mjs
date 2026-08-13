#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = resolve(ROOT, "data/transactions");
const RPC_URL =
  process.env.ROBINHOOD_RPC_URL
  ?? "https://rpc.mainnet.chain.robinhood.com";
const EXPLORER = "https://robinhoodchain.blockscout.com/tx";

const ACTIONS = [
  {
    category: "observed-exploit",
    label: "Representative stale-approval transfer",
    transaction:
      "0xe35ce85a413415ab268b5e7e7ce822066072de5117ebf081d2ca4357d22cbd8c",
    expectedTo: "0xb53ccf301cf2e2283265810372a0915defb7e53d",
    notes: "Representative incident transaction; not the complete incident set.",
  },
  {
    category: "containment",
    label: "Ban observed exploit runtime codehash",
    transaction:
      "0x179d4dd6024bbf854b77feac2137fa26ce6decc302c5dbf01737707d1c095985",
    expectedTo: "0x40686524e56aff0f1446958725dcf6e6da5381e6",
    notes:
      "Owner call to banVenueCodehash for runtime hash 0x849542ca8df7205f2117bfa1a8556e57c3a2a71e7b806e07597a33a5f8835723.",
  },
  {
    category: "containment",
    label: "Stop registered canonical pool routing",
    transaction:
      "0xe250bed652711301eafd807d537dd44b5356482e8333553af2421c4eddccd7f6",
    expectedTo: "0x40686524e56aff0f1446958725dcf6e6da5381e6",
    notes:
      "Redirected V1's authorized hook to the dead address. This stopped registered canonical pools, not every possible external pool.",
  },
  ...[
    ["NVDA", "0x8c5634cc30b24a49708e922d95e97a91445445ccdacecb5336932c2038b3223a"],
    ["AAPL", "0x82ce7062b73f37b0fd75904db45d97d94ea7c63064fea4bd01e742889fc0bbe4"],
    ["TSLA", "0x45d233a6c2ed1e5a81c01912514356318f4ae9e5a93a08e72f97221d9de3f665"],
    ["GME", "0xdae39b03c45c2a689058f4925139d5439f4d27e6f9c0285bebff4ed320d2dc35"],
    ["SPCX", "0xc28d5b5dde140571cd1609f6613883700d2bb1b0e5525431fb5b972fc164c016"],
    ["SPY", "0xa0fe34dfdb7aa1d5f97a127046961b4aafa4e489fca7d7d500bd2f6c5c036249"],
    ["PLTR", "0xf079d5cd82f9c19c8225d40ec3a0e775aa21739ebde5904e5d857003de8a9e12"],
    ["NFLX", "0x791a4ba855128660bad1c9f9b495405b8a19a5579c7c7616290093d4e895bed7"],
    ["RDDT", "0xe3883f0d23c49d015214684758e4d749320aa9d4636c6244c77ed0e7c0d45e33"],
    ["MSTR", "0x5046f53bfb21d0681388071b9d1d48fa926c479f950867a9e4344fa614985a7b"],
  ].map(([floor, transaction]) => ({
    category: "fund-preservation",
    label: `Sweep ${floor} V1 burn and LP pots to keeper`,
    transaction,
    expectedTo: "0x5a7d914597476393794e100ddd8b70f8c3f570cc",
    notes:
      "Keeper-authorized sweepPots call. Destination was fixed to the published keeper wallet.",
  })),
];

let rpcId = 0;

async function rpc(method, params) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++rpcId,
      method,
      params,
    }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(`${method}: ${JSON.stringify(payload.error ?? payload)}`);
  }
  return payload.result;
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

async function main() {
  const rows = [];
  for (const action of ACTIONS) {
    const transaction = await rpc(
      "eth_getTransactionByHash",
      [action.transaction],
    );
    const receipt = await rpc(
      "eth_getTransactionReceipt",
      [action.transaction],
    );
    if (!transaction || !receipt) {
      throw new Error(`Missing transaction or receipt: ${action.transaction}`);
    }
    if (transaction.to.toLowerCase() !== action.expectedTo) {
      throw new Error(`Unexpected destination: ${action.transaction}`);
    }
    const block = await rpc("eth_getBlockByNumber", [receipt.blockNumber, false]);
    rows.push({
      category: action.category,
      label: action.label,
      transaction_hash: action.transaction,
      block_number: BigInt(receipt.blockNumber).toString(),
      timestamp_utc: new Date(
        Number(BigInt(block.timestamp)) * 1_000,
      ).toISOString(),
      from: transaction.from,
      to: transaction.to,
      status: BigInt(receipt.status) === 1n ? "success" : "reverted",
      explorer_url: `${EXPLORER}/${action.transaction}`,
      notes: action.notes,
    });
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    resolve(OUTPUT_DIR, "mitigation.csv"),
    csv(rows, [
      "category",
      "label",
      "transaction_hash",
      "block_number",
      "timestamp_utc",
      "from",
      "to",
      "status",
      "explorer_url",
      "notes",
    ]),
  );
  console.log(`Verified and wrote ${rows.length} transaction records.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
