# deno-kv-logviewer

Deno KVに保存したデータを見る用のスクリプト

一部ログ用に保存したフィールド専用の処理も入れてある

## install

```
deno install --allow-net --allow-env --unstable-kv https://github.com/swfz/deno-kv-logviewer/logviewer.ts
```

## Prerequisites

Deno
KVにアクセスするには環境変数`DENO_KV_ACCESS_TOKEN`にあらかじめ値を設定しておく

TOKENの発行は管理画面の[Account Settings](https://dash.deno.com/account#access-tokens)から行う

## Usage

```
$ logviewer --help

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
```

## Example

{id}の箇所の値はProjectのKVタブから取得する

```
$ deno run --allow-net --allow-env --unstable-kv logviewer.ts --url=https://api.deno.com/databases/{id}/connect --prefix=logs,2024,9 --exclude=headers,value,versionstamp,bodyUsed,redirect,ua

┌───────┬──────────────────────────────────────────────────────┬────────┬─────────────────────────────────────────────────────────────┬────────────────────────────┬────────────┬──────────────┬─────────┬────────────────────────────────┐
│ (idx) │ key                                                  │ method │ url                                                         │ ts                         │ user       │ to           │ theme   │ referer                        │
├───────┼──────────────────────────────────────────────────────┼────────┼─────────────────────────────────────────────────────────────┼────────────────────────────┼────────────┼──────────────┼─────────┼────────────────────────────────┤
│     0 │ [ "logs", 2024, 9, 5, "01J70480GF97GVKTQ4JTV7NERY" ] │ "GET"  │ "https://kusa-image.deno.dev/swfz"                          │ "2024-09-05T03:39:28.000Z" │ "swfz"     │ undefined    │ "light" │ undefined                      │
│     1 │ [ "logs", 2024, 9, 5, "01J70487J7CQ32WXK8R973SP9A" ] │ "GET"  │ "https://kusa-image.deno.dev/swfz?to=2023-01-01"            │ "2024-09-05T03:39:35.000Z" │ "swfz"     │ "2023-01-01" │ "light" │ undefined                      │
│     2 │ [ "logs", 2024, 9, 5, "01J7048CAKF7P2W9ZE4QM75B6V" ] │ "GET"  │ "https://kusa-image.deno.dev/swfz?to=2023-01-01&theme=dark" │ "2024-09-05T03:39:40.000Z" │ "swfz"     │ "2023-01-01" │ "dark"  │ undefined                      │
```

## 補足

Denoアプリケーションで次のようなサンプルコードでアクセスログを仕込んだ状態のKVに最適化されている

- logger.ts

```typescript
import { ulid } from "jsr:@std/ulid";

const EXPIRE_LOGS_DAYS = 90;

const logObject = async (now: Date, req: Request) => {
  const ts = Math.floor(now.getTime() / 1000);

  return {
    method: req.method,
    url: req.url,
    redirect: req.redirect,
    bodyUsed: req.bodyUsed,
    ...{ ts: ts },
    headers: Object.fromEntries(req.headers.entries()),
    ...(req.body ? { body: await req.text() } : {}),
  };
};

const log = async (request: Request, additionalData) => {
  const kv = await Deno.openKv();
  const now = new Date();
  const logRecord = { ...(await logObject(now, request)), ...additionalData };

  return await kv.set(
    ["logs", now.getFullYear(), now.getMonth() + 1, now.getDate(), ulid()],
    logRecord,
    {
      expireIn: 1000 * 60 * 60 * 24 * EXPIRE_LOGS_DAYS,
    },
  );
};

export { log };
```

- server.ts

```typescript
import { log } from "./logger.ts";

const handler = async (request: Request): Promise<Response> => {
  log(request, {});

  // .....
  // .....
  // .....
  // .....

  return new Response(`ok`, { status: 200 });
};

const port = 8080;
Deno.serve({ port }, handler);
```
