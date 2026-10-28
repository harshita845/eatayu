# Call masking (Exotel)

Customers, riders and restaurants can call each other about an order without seeing each other's real phone numbers. Both phones show the Exotel virtual number (ExoPhone) as the caller ID.

## How it works

1. A user taps **Call** in the app. The app sends `POST /api/v1/calls/masked` with `{ orderId, targetRole }`.
2. The server identifies the caller from their login token. It checks that they belong to the order, that the order is in a callable state, and that they are under the rate limit.
3. The server looks up both real numbers in the database and asks Exotel to "connect two numbers": Exotel **rings the caller first**, then dials the other party once the caller answers.
   - If Exotel answers with a server error (5xx), the server tries once more with the two numbers swapped, so the other party's phone rings first. Exotel was seen to fail this way when the second number is on DND, while the same pair connected the other way round. Both phones still see only the ExoPhone, and the call log records `legsSwapped: true`.
4. Exotel reports the outcome to `POST /api/v1/webhooks/exotel/call-status`, which updates the `food_call_logs` record.

Real numbers are never returned to the apps or written to logs. Call logs store only the last 4 digits (`******1234`).

### Who can call whom

| Caller | Can call |
|---|---|
| Customer | the rider, the restaurant |
| Rider (after accepting the order) | the customer, the restaurant |
| Restaurant | the rider, the customer |

- **When:** calls are allowed from the moment the restaurant accepts (`confirmed`/`preparing`) through `picked_up`, and for `CALL_MASKING_POST_DELIVERY_MINUTES` (default 30) after delivery. They are blocked for cancelled orders and for orders the restaurant hasn't accepted yet.
- **Calling the rider** requires a rider who has accepted the order.
- **Rate limit:** `CALL_MASKING_RATE_LIMIT_MAX` (default 5) attempts per user per order every `CALL_MASKING_RATE_LIMIT_WINDOW_SECONDS` (default 600). The limit is shared across PM2 instances through Redis.
- **Which customer number is used:** when someone calls the customer, Exotel dials the order's delivery-address number first (the person receiving the food), then the account number. When the customer is the caller, Exotel rings their account number.

## Environment variables (`Backend/.env`)

| Variable | Required when enabled | Notes |
|---|---|---|
| `CALL_MASKING_ENABLED` | n/a | `true` to turn on. When `false`, the endpoint returns `503 CALL_MASKING_DISABLED`, makes no Exotel request, and the apps hide the call buttons. |
| `EXOTEL_ACCOUNT_SID` | yes | e.g. `eatayufooddeliveryllp2` |
| `EXOTEL_API_KEY` | yes | Exotel dashboard → API settings |
| `EXOTEL_API_TOKEN` | yes | secret, never commit |
| `EXOTEL_SUBDOMAIN` | yes | `api.exotel.com` (Singapore cluster) |
| `EXOTEL_EXOPHONE` | yes | your ExoPhone, as shown in Exotel |
| `EXOTEL_WEBHOOK_SECRET` | yes | long random string, e.g. `openssl rand -hex 32` |
| `PUBLIC_API_BASE_URL` | yes | public HTTPS origin of the API: `https://eatayu.com` |
| `EXOTEL_CALL_TIME_LIMIT_SECONDS` | no | max call length, default 600 |
| `EXOTEL_RING_TIMEOUT_SECONDS` | no | ring time per leg, default 30 |
| `EXOTEL_RECORD_CALLS` | no | default `false` |
| `CALL_MASKING_POST_DELIVERY_MINUTES` | no | default 30 |
| `CALL_MASKING_RATE_LIMIT_MAX` / `_WINDOW_SECONDS` | no | default 5 per 600 s |

With `CALL_MASKING_ENABLED=true`, the server refuses to start if any required variable is missing and logs exactly which ones.

## Setting it up on the VPS

```bash
ssh root@201.18.196.134
nano /root/eatayu/Backend/.env          # add/update the variables above
cd /root/eatayu
pm2 reload deploy/ecosystem.config.cjs --update-env
pm2 logs EatAyu-api --lines 50          # look for "Missing required environment variables" if it fails
```

`~/deploy.sh` runs `git pull`, and `.env` is git-ignored, so deploys never overwrite the server's `.env`. Keep secrets only in that file.

## Exotel callback URL

The server sends this URL to Exotel with every call, so nothing needs configuring in the Exotel dashboard:

```
https://eatayu.com/api/v1/webhooks/exotel/call-status?secret=<EXOTEL_WEBHOOK_SECRET>
```

- Requests without the right secret get `401`.
- The handler is idempotent: Exotel retries and late events never overwrite a final status.
- The app redacts `?secret=` from its own request logs.
- Nginx access logs still record the full URL. To avoid that, add this inside the HTTPS `server` block in `/etc/nginx/sites-enabled/eatayu.conf`, then run `nginx -t && systemctl reload nginx`:

```nginx
location = /api/v1/webhooks/exotel/call-status {
    access_log off;
    proxy_pass http://127.0.0.1:5000;
    include /etc/nginx/eatayu_proxy_headers.conf;
}
```

## Testing with a real call

1. Set the variables, turn on `CALL_MASKING_ENABLED=true`, and reload PM2 as shown above.
2. Place a test order and have the restaurant accept it; a rider should accept too.
3. In the customer app, open the order and tap **Call rider**. The customer's phone should ring from the ExoPhone first; when they answer, the rider's phone rings, also showing the ExoPhone.
4. Check the record (admin token required): `GET /api/v1/food/admin/orders/<orderId>/calls`. The status should move to `completed`, with a duration, once the callback arrives.
5. Repeat for rider → customer and restaurant → rider.

## Running the tests

```bash
cd Backend && npm test
```

The unit tests cover phone normalization, permission and status rules, the rate limiter, the webhook secret check and payload parsing, the Exotel client (with mocked HTTP), env validation, phone stripping from order responses, and the HTTP routes in disabled mode.
