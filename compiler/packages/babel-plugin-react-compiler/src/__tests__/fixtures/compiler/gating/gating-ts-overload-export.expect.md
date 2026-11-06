
## Input

```javascript
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

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
import { isForgetEnabled_Fixtures } from "ReactForgetFeatureFlag"; // @gating @compilationMode:"annotation"
import { useStore } from "shared-runtime";

interface Session {
  user: string;
}

// Overload signatures
export function useSession(): Session | null;
export function useSession<T>(selector: (session: Session) => T): T | null;
// Implementation
export const useSession = isForgetEnabled_Fixtures()
  ? function useSession(selector) {
      "use forget";
      const $ = _c(2);
      let t0;
      if ($[0] !== selector) {
        t0 = (s) => {
          const session = s.session;
          if (!session) {
            return null;
          }
          return selector ? selector(session) : session;
        };
        $[0] = selector;
        $[1] = t0;
      } else {
        t0 = $[1];
      }
      return useStore(t0);
    }
  : function useSession(selector?: (session: Session) => T) {
      "use forget";
      return useStore((s: { session: Session | null }) => {
        const session = s.session;
        if (!session) return null;
        return selector ? selector(session) : session;
      });
    };

export const FIXTURE_ENTRYPOINT = {
  fn: eval("useSession"),
  params: [[]],
};

```
      
### Eval output
(kind: exception) (0 , _sharedRuntime.useStore) is not a function