
## Input

```javascript
import fbt from 'fbt';
import * as React from 'react';
import {useState} from 'react';

// Minimized from MusicPartnerManagerMusicWorkDocumentStoreRenderer.react.js
// Tests AlignMethodCallScopes mutable_range sync after scope merging.

function nullthrows(x) {
  if (x != null) return x;
  throw new Error('nullthrows');
}

function Component({store}) {
  const [isShown, setIsShown] = useState(false);
  const id = nullthrows(store?.id);
  const storeUri = nullthrows(store?.store_uri);
  const licensedGeos = nullthrows(store?.licensed_geos);
  const documentSchema = nullthrows(store?.document_schema);
  const ingestionEnabled = nullthrows(store?.ingestion_enabled);
  const cwrSenderIds = store?.cwr_sender_ids;

  if (!store.hasOwnProperty('store_uri')) {
    return;
  }

  return (
    <div key={store.id}>
      <span>
        <span>
          {fbt(
            `Directory: ${fbt.param(
              'store URI',
              storeUri.replace('sftp://sftp.fb.com', '')
            )}`,
            'directory info'
          )}
        </span>
        <span>
          {fbt(`Schema: ${fbt.param('schema', documentSchema)}`, 'schema')},{' '}
          {fbt(`Geos: ${fbt.param('geos', licensedGeos.length)}`, 'geos count')}
          ,{' '}
        </span>
        {cwrSenderIds != null && <span>Sender ID: {cwrSenderIds[0]}</span>}
        <span>Ingestion: {ingestionEnabled ? 'Enabled' : 'Disabled'}</span>
        <span>
          {[...licensedGeos].sort().join(',')}
          <button
            onClick={() => {
              console.log('copied');
            }}>
            Copy
          </button>
        </span>
      </span>
      <span>
        <button onClick={() => setIsShown(true)} />
        <button onClick={() => console.log(id.toString())} />
        {isShown && <button onClick={() => setIsShown(false)} />}
      </span>
    </div>
  );
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      store: {
        id: '1',
        store_uri: 'sftp://sftp.fb.com/Music',
        licensed_geos: ['US', 'GB'],
        document_schema: 'CWR',
        ingestion_enabled: true,
        cwr_sender_ids: ['123'],
      },
    },
  ],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import fbt from "fbt";
import * as React from "react";
import { useState } from "react";

// Minimized from MusicPartnerManagerMusicWorkDocumentStoreRenderer.react.js
// Tests AlignMethodCallScopes mutable_range sync after scope merging.

function nullthrows(x) {
  if (x != null) {
    return x;
  }
  throw new Error("nullthrows");
}

function Component(t0) {
  const $ = _c(37);
  const { store } = t0;
  const [isShown, setIsShown] = useState(false);
  const t1 = store?.id;
  let t2;
  if ($[0] !== t1) {
    t2 = nullthrows(t1);
    $[0] = t1;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  const id = t2;
  let t3;
  let t4;
  let t5;
  let t6;
  let t7;
  let t8;
  let t9;
  if ($[2] !== store) {
    t9 = Symbol.for("react.early_return_sentinel");
    bb0: {
      const storeUri = nullthrows(store?.store_uri);
      const licensedGeos = nullthrows(store?.licensed_geos);
      const documentSchema = nullthrows(store?.document_schema);
      const ingestionEnabled = nullthrows(store?.ingestion_enabled);
      const cwrSenderIds = store?.cwr_sender_ids;
      if (!store.hasOwnProperty("store_uri")) {
        t9 = undefined;
        break bb0;
      }
      t8 = store.id;
      const t10 = fbt._(
        "Directory: {store URI}",
        [fbt._param("store URI", storeUri.replace("sftp://sftp.fb.com", ""))],
        { hk: "y1DI6" },
      );
      if ($[10] !== t10) {
        t4 = <span>{t10}</span>;
        $[10] = t10;
        $[11] = t4;
      } else {
        t4 = $[11];
      }
      t5 = (
        <span>
          {fbt._("Schema: {schema}", [fbt._param("schema", documentSchema)], {
            hk: "1Ua9F9",
          })}
          ,{" "}
          {fbt._("Geos: {geos}", [fbt._param("geos", licensedGeos.length)], {
            hk: "1PRSzD",
          })}
          ,{" "}
        </span>
      );
      if ($[12] !== cwrSenderIds) {
        t6 = cwrSenderIds != null && <span>Sender ID: {cwrSenderIds[0]}</span>;
        $[12] = cwrSenderIds;
        $[13] = t6;
      } else {
        t6 = $[13];
      }
      const t11 = ingestionEnabled ? "Enabled" : "Disabled";
      if ($[14] !== t11) {
        t7 = <span>Ingestion: {t11}</span>;
        $[14] = t11;
        $[15] = t7;
      } else {
        t7 = $[15];
      }
      t3 = [...licensedGeos].sort().join(",");
    }
    $[2] = store;
    $[3] = t3;
    $[4] = t4;
    $[5] = t5;
    $[6] = t6;
    $[7] = t7;
    $[8] = t8;
    $[9] = t9;
  } else {
    t3 = $[3];
    t4 = $[4];
    t5 = $[5];
    t6 = $[6];
    t7 = $[7];
    t8 = $[8];
    t9 = $[9];
  }
  if (t9 !== Symbol.for("react.early_return_sentinel")) {
    return t9;
  }
  let t10;
  if ($[16] === Symbol.for("react.memo_cache_sentinel")) {
    t10 = <button onClick={_temp}>Copy</button>;
    $[16] = t10;
  } else {
    t10 = $[16];
  }
  let t11;
  if ($[17] !== t3) {
    t11 = (
      <span>
        {t3}
        {t10}
      </span>
    );
    $[17] = t3;
    $[18] = t11;
  } else {
    t11 = $[18];
  }
  let t12;
  if (
    $[19] !== t11 ||
    $[20] !== t4 ||
    $[21] !== t5 ||
    $[22] !== t6 ||
    $[23] !== t7
  ) {
    t12 = (
      <span>
        {t4}
        {t5}
        {t6}
        {t7}
        {t11}
      </span>
    );
    $[19] = t11;
    $[20] = t4;
    $[21] = t5;
    $[22] = t6;
    $[23] = t7;
    $[24] = t12;
  } else {
    t12 = $[24];
  }
  let t13;
  if ($[25] === Symbol.for("react.memo_cache_sentinel")) {
    t13 = <button onClick={() => setIsShown(true)} />;
    $[25] = t13;
  } else {
    t13 = $[25];
  }
  let t14;
  if ($[26] !== id) {
    t14 = <button onClick={() => console.log(id.toString())} />;
    $[26] = id;
    $[27] = t14;
  } else {
    t14 = $[27];
  }
  let t15;
  if ($[28] !== isShown) {
    t15 = isShown && <button onClick={() => setIsShown(false)} />;
    $[28] = isShown;
    $[29] = t15;
  } else {
    t15 = $[29];
  }
  let t16;
  if ($[30] !== t14 || $[31] !== t15) {
    t16 = (
      <span>
        {t13}
        {t14}
        {t15}
      </span>
    );
    $[30] = t14;
    $[31] = t15;
    $[32] = t16;
  } else {
    t16 = $[32];
  }
  let t17;
  if ($[33] !== t12 || $[34] !== t16 || $[35] !== t8) {
    t17 = (
      <div key={t8}>
        {t12}
        {t16}
      </div>
    );
    $[33] = t12;
    $[34] = t16;
    $[35] = t8;
    $[36] = t17;
  } else {
    t17 = $[36];
  }
  return t17;
}
function _temp() {
  console.log("copied");
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      store: {
        id: "1",
        store_uri: "sftp://sftp.fb.com/Music",
        licensed_geos: ["US", "GB"],
        document_schema: "CWR",
        ingestion_enabled: true,
        cwr_sender_ids: ["123"],
      },
    },
  ],
};

```
      
### Eval output
(kind: ok) <div><span><span>Directory: /Music</span><span>Schema: CWR, Geos: 2, </span><span>Sender ID: 123</span><span>Ingestion: Enabled</span><span>GB,US<button>Copy</button></span></span><span><button></button><button></button></span></div>