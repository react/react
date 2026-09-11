// @gating @compilationMode:"annotation"
import {useStore} from 'shared-runtime';

interface Session {
  user: string;
}

// Overload signatures
export function useSession(): Session | null;
export function useSession<T>(selector: (session: Session) => T): T | null;
// Implementation
export function useSession<T>(
  selector?: (session: Session) => T,
): Session | T | null {
  'use forget';
  return useStore((s: {session: Session | null}) => {
    const session = s.session;
    if (!session) return null;
    return selector ? selector(session) : session;
  });
}

export const FIXTURE_ENTRYPOINT = {
  fn: eval('useSession'),
  params: [[]],
};
