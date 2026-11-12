
## Input

```javascript
// @validateRefAccessDuringRender

function useHook(parentRef) {
  // Some components accept a union of "callback" refs and ref objects, which
  // we can't currently represent
  const elementRef = useRef(null);
  const handler = instance => {
    elementRef.current = instance;
    if (parentRef != null) {
      if (typeof parentRef === 'function') {
        // This call infers the type of `parentRef` as a function...
        parentRef(instance);
      } else {
        // So this assignment fails since we don't know its a ref
        parentRef.current = instance;
      }
    }
  };
  return handler;
}

```


## Error

```
Found 2 errors:

Error: This value cannot be modified

Modifying component props or hook arguments is not allowed. Consider using a local variable instead.

error.todo-allow-assigning-to-inferred-ref-prop-in-callback.ts:15:8
  13 |       } else {
  14 |         // So this assignment fails since we don't know its a ref
> 15 |         parentRef.current = instance;
     |         ^^^^^^^^^ `parentRef` cannot be modified
  16 |       }
  17 |     }
  18 |   };

Error: Cannot modify local variables after render completes

This argument is a function which may reassign or mutate `parentRef` after render, which can cause inconsistent behavior on subsequent renders. Consider using state instead.

error.todo-allow-assigning-to-inferred-ref-prop-in-callback.ts:19:9
  17 |     }
  18 |   };
> 19 |   return handler;
     |          ^^^^^^^ This function may (indirectly) reassign or modify `parentRef` after render
  20 | }
  21 |

error.todo-allow-assigning-to-inferred-ref-prop-in-callback.ts:15:8
  13 |       } else {
  14 |         // So this assignment fails since we don't know its a ref
> 15 |         parentRef.current = instance;
     |         ^^^^^^^^^ This modifies `parentRef`
  16 |       }
  17 |     }
  18 |   };
```
          
      