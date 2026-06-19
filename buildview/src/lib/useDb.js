import {useSyncExternalStore} from 'react';
import {db} from '../data/db.js';

// Subscribe the calling component to the data store. Returns the store version
// (a stable number that changes on every write), which is all React needs to
// know when to re-render. Components then read whatever they need by calling
// db.* directly in their render — those reads still go through the seam.
//
// This hook never touches storage itself.
export function useDbVersion() {
  return useSyncExternalStore(db.subscribe, db.getVersion, db.getVersion);
}
