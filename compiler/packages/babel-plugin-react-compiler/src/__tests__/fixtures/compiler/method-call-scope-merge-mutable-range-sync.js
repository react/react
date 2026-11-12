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
