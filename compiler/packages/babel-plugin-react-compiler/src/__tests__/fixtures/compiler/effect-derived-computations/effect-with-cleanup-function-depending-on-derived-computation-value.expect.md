
## Input

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"

import {useEffect, useState} from 'react';

function Component(file: File) {
  const [imageUrl, setImageUrl] = useState(null);

  /*
   * Cleaning up the variable or a source of the variable used to setState
   * inside the effect communicates that we always need to clean up something
   * which is a valid use case for useEffect. In which case we want to
   * avoid an throwing
   */
  useEffect(() => {
    const imageUrlPrepared = URL.createObjectURL(file);
    setImageUrl(imageUrlPrepared);
    return () => URL.revokeObjectURL(imageUrlPrepared);
  }, [file]);

  return <Image src={imageUrl} xstyle={styles.imageSizeLimits} />;
}

```

## Code

```javascript
// @validateNoDerivedComputationsInEffects_exp @loggerTestOnly @outputMode:"lint"

import { useEffect, useState } from "react";

function Component(file: File) {
  const [imageUrl, setImageUrl] = useState(null);

  /*
   * Cleaning up the variable or a source of the variable used to setState
   * inside the effect communicates that we always need to clean up something
   * which is a valid use case for useEffect. In which case we want to
   * avoid an throwing
   */
  useEffect(() => {
    const imageUrlPrepared = URL.createObjectURL(file);
    setImageUrl(imageUrlPrepared);
    return () => URL.revokeObjectURL(imageUrlPrepared);
  }, [file]);

  return <Image src={imageUrl} xstyle={styles.imageSizeLimits} />;
}

```

## Logs

```
{"kind":"CompileSuccess","fnLoc":{"start":{"line":5,"column":0,"index":127},"end":{"line":21,"column":1,"index":719},"filename":"effect-with-cleanup-function-depending-on-derived-computation-value.ts"},"fnName":"Component","memoSlots":5,"memoBlocks":2,"memoValues":3,"prunedMemoBlocks":0,"prunedMemoValues":0}
```
      
### Eval output
(kind: exception) Fixture not implemented