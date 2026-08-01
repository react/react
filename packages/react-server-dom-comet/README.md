# react-server-dom-comet

Experimental React Flight bindings for DOM, tailored for the **CometJS** meta-framework.

**Use it at your own risk.**

> **Status: scaffold.** This package derives from `react-server-dom-esm` (native
> ESM Flight, designed for meta-framework integration) and adds the CometJS
> extension points. The base client/server/static entries are intended to fork
> `react-server-dom-esm`'s implementations and wire into the repo's rollup build
> (`scripts/rollup/bundles.js`); that wiring is **not** included here yet. The
> `./delta` module is self-contained and implemented.

## Why a dedicated binding

CometJS needs more than the stock Flight binding provides (roadmap Pillar A):

1. **A Relay-store delta carrier for differential piggyback** (roadmap C.3 / C.5 / C.18).
   On a page transition CometJS carries the RSC tree **and** the Relay data in one
   stream, but includes **only the records the client doesn't already have**. The
   client sends a compact store digest; the server omits records the digest
   reports as present before serializing the Relay delta. See `./delta`.
2. **A first-class external-store reference type** so a normalized Relay payload
   travels the same Flight stream as the component tree (rather than riding as an
   opaque prop blob), consumed on the client via `use()` and handed to
   `environment.hydrate()`. Today this is approximated with outlined/promise rows;
   the first-class carrier is a fork of the ESM server/client config.

## Relationship to `react-server-dom-esm`

The client/server/static/node-loader modules mirror `react-server-dom-esm`
exactly (see that package's `src/`), so upstream Flight fixes flow through. The
CometJS-specific additions live alongside them:

- `src/ReactFlightCometDeltaCarrier.js` — server-side record omission given a
  client store digest, and the client-side merge contract. Pure, dependency-free,
  isomorphic; the digest wire format matches CometJS `relay/store-digest.ts`
  (`m,k,<base64 bits>`, a Bloom filter over data IDs). No React internals.

## Wire contract (delta carrier)

- Client → server (navigation request): `x-comet-store-digest: <m,k,base64>` — a
  Bloom filter of the record data-IDs the client holds **and considers fresh**
  (stale records excluded so they're re-sent).
- Server: run the route's Relay preloads → normalized records; call
  `omitPresentRecords(records, digest)`; serialize only `send` into the Flight
  payload (the delta).
- Client: merge the delta into the Relay store by data ID via
  `environment.hydrate(...)`. A Bloom false positive (a wrongly-omitted record)
  is corrected by the reading component's `store-or-network` fallback.

## TODO to graduate from scaffold

- Fork the ESM `src/client` + `src/server` config modules and add the external-store
  reference type + delta-carrier hooks to the server serializer / client parser.
- Wire the package into `scripts/rollup/bundles.js` and `scripts/shared/inlinedHostConfigs.js`.
- Add fixtures + tests under `scripts/`.
