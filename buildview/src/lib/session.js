import {db} from '../data/db.js';
import {useDbVersion} from './useDb.js';

// The current (fake) logged-in user. Reads the session id from the seam and
// resolves it to the user record. Re-renders when login state or data changes.
export function useSession() {
  useDbVersion();
  const userId = db.session.getCurrentUserId();
  const user = userId ? db.users.get(userId) : null;

  return {
    user, // null when logged out (or the stored id no longer exists)
    login: id => db.session.setCurrentUserId(id),
    logout: () => db.session.clear(),
  };
}
