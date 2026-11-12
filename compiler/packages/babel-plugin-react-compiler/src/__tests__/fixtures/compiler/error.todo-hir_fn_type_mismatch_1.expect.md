
## Input

```javascript
/**
 * @flow strict-local
 * @format
 */

'use strict';

import type QueryVersion from 'QueryVersion';

import QueryTypes from 'QueryTypes';
import ResultsTabContext from 'ResultsTabContext';
import ResultsTabs from 'ResultsTabs';

import {useContext, useEffect, useRef} from 'react';
import useDispatchSafe from 'useDispatchSafe';
/**
 * This component is used to let the Event Store know when a Presto query is
 * executed in Query Editor. This event is used as a signal for VizAgent.
 */
export default component ClassicQueryExecutionDispatcher(
  version: ?QueryVersion
) {
  const dispatch = useDispatchSafe();

  const {selectedTab, shouldShowData} = useContext(ResultsTabContext);
  const lastLoggedVersionID = useRef<?string>(null);

  useEffect(() => {
    if (version == null) {
      return;
    }

    const versionID = version.getID();
    if (lastLoggedVersionID.current === versionID) {
      // Classic creates a new version for every execution, so we only want to
      // log once per execution
      return;
    }

    const queryType = version.getType().getName();
    if (queryType !== QueryTypes.PRESTO) {
      // Only log for Presto queries
      return;
    }

    let shouldDispatch = false;
    switch (selectedTab) {
      case ResultsTabs.VISUALIZATION:
        shouldDispatch = shouldShowData;
        break;
      case ResultsTabs.DATA:
        shouldDispatch =
          shouldShowData &&
          version?.getStatus() != null &&
          version?.getStatus() !== 'draft';
        break;
      default:
        shouldDispatch = false;
    }

    if (shouldDispatch && dispatch != null) {
      dispatch({
        queryeditorQueryConfig: version.getImmutableConfig(),
        queryID: version.getQueryID(),
        selectedTab,
        type: '[ClassicQueryExecutionDispatcher] Executed Query Editor Presto Query',
        versionID,
      });
      lastLoggedVersionID.current = versionID;
    }
  }, [dispatch, selectedTab, shouldShowData, version]);
  return;
}

```


## Error

```
Missing semicolon. (20:24)
```
          
      