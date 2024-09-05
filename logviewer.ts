import { parseArgs } from "jsr:@std/cli/parse-args";

const usage = `
Usage: logviewer.ts [options]

Description:
  Script to view logs and other data stored in deno KV

Environments:
  DENO_KV_ACCESS_TOKEN    Set the TOKEN issued from the management console. see more https://docs.deno.com/deploy/kv/manual/on_deploy/#connect-to-managed-databases-from-outside-of-deno-deploy

Options:
  --help     Show this message and exit.
  --json     Output JSON format.
  --url      KV connect url. can be found on the KV tab of the admin page.
  --prefix   KV key prefix. comma-separated string.
  --exclude  not display record key.
`;

const flags = parseArgs(Deno.args, {
  boolean: ["help", "json"],
  string: ["url", "prefix", "exclude"],
  default: { json: false },
  negatable: [],
});

const parsePrefix = (prefix) => {
  return prefix.split(",").map((p) =>
    !isNaN(Number(p)) && Number.isInteger(Number(p)) ? parseInt(p) : p
  );
};

const filterRecord = (record, exclude) => {
  return Object.fromEntries(
    Object.entries(record).filter(([key, _]) => !exclude.includes(key)),
  );
};

const transformValue = (record) => {
  return {
    ...record,
    ...record.value,
    ...(record.value.ts
      ? { ts: new Date(record.value.ts * 1000).toISOString() }
      : {}),
    ...(record.value.url ? { url: decodeURI(record.value.url) } : {}),
    ...(record.value.headers?.referer
      ? { referer: record.value.headers.referer }
      : {}),
    ...(record.value.headers?.["user-agent"]
      ? { ua: record.value.headers["user-agent"] }
      : {}),
  };
};

const main = async (flags) => {
  const kv = await Deno.openKv(flags.url);
  const results = kv.list({ prefix: parsePrefix(flags.prefix) });

  const records = [];
  for await (const r of results) records.push(r);

  const exclude = flags.exclude ? flags.exclude.split(",") : [];

  const rows = records.map((r) => (filterRecord(transformValue(r), exclude)));

  if (flags.json) {
    console.log(JSON.stringify(rows));
  } else {
    console.table(rows);
  }
};

if (flags.help) {
  console.log(usage);
  Deno.exit(0);
}

main(flags);
