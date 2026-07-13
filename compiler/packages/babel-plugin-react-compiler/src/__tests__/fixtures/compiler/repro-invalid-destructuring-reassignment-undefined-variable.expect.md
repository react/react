
## Input

```javascript
// @flow @compilationMode:"infer"
'use strict';

function getWeekendDays(user) {
  return [0, 6];
}

function getConfig(weekendDays) {
  return [1, 5];
}

component Calendar(user, defaultFirstDay, currentDate, view) {
  const weekendDays = getWeekendDays(user);
  let firstDay = defaultFirstDay;
  let daysToDisplay = 7;
  if (view === 'week') {
    let lastDay;
    // this assignment produces invalid code
    [firstDay, lastDay] = getConfig(weekendDays);
    daysToDisplay = ((7 + lastDay - firstDay) % 7) + 1;
  } else if (view === 'day') {
    firstDay = currentDate.getDayOfWeek();
    daysToDisplay = 1;
  }

  return [currentDate, firstDay, daysToDisplay];
}

export const FIXTURE_ENTRYPOINT = {
  fn: Calendar,
  params: [
    {
      user: {},
      defaultFirstDay: 1,
      currentDate: {getDayOfWeek: () => 3},
      view: 'week',
    },
  ],
  sequentialRenders: [
    {
      user: {},
      defaultFirstDay: 1,
      currentDate: {getDayOfWeek: () => 3},
      view: 'week',
    },
    {
      user: {},
      defaultFirstDay: 1,
      currentDate: {getDayOfWeek: () => 3},
      view: 'day',
    },
  ],
};

```

## Code

```javascript
"use strict";
import { c as _c } from "react/compiler-runtime";

function getWeekendDays(user) {
  return [0, 6];
}

function getConfig(weekendDays) {
  return [1, 5];
}

function Calendar(t0) {
  const $ = _c(12);
  const { user, defaultFirstDay, currentDate, view } = t0;
  let daysToDisplay;
  let firstDay;
  if (
    $[0] !== currentDate ||
    $[1] !== defaultFirstDay ||
    $[2] !== user ||
    $[3] !== view
  ) {
    const weekendDays = getWeekendDays(user);
    firstDay = defaultFirstDay;
    daysToDisplay = 7;
    if (view === "week") {
      let lastDay;

      [firstDay, lastDay] = getConfig(weekendDays);
      daysToDisplay = ((7 + lastDay - firstDay) % 7) + 1;
    } else {
      if (view === "day") {
        let t1;
        if ($[6] !== currentDate) {
          t1 = currentDate.getDayOfWeek();
          $[6] = currentDate;
          $[7] = t1;
        } else {
          t1 = $[7];
        }
        firstDay = t1;
        daysToDisplay = 1;
      }
    }
    $[0] = currentDate;
    $[1] = defaultFirstDay;
    $[2] = user;
    $[3] = view;
    $[4] = daysToDisplay;
    $[5] = firstDay;
  } else {
    daysToDisplay = $[4];
    firstDay = $[5];
  }
  let t1;
  if ($[8] !== currentDate || $[9] !== daysToDisplay || $[10] !== firstDay) {
    t1 = [currentDate, firstDay, daysToDisplay];
    $[8] = currentDate;
    $[9] = daysToDisplay;
    $[10] = firstDay;
    $[11] = t1;
  } else {
    t1 = $[11];
  }
  return t1;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Calendar,
  params: [
    {
      user: {},
      defaultFirstDay: 1,
      currentDate: { getDayOfWeek: () => 3 },
      view: "week",
    },
  ],

  sequentialRenders: [
    {
      user: {},
      defaultFirstDay: 1,
      currentDate: { getDayOfWeek: () => 3 },
      view: "week",
    },
    {
      user: {},
      defaultFirstDay: 1,
      currentDate: { getDayOfWeek: () => 3 },
      view: "day",
    },
  ],
};

```
      
### Eval output
(kind: ok) [{"getDayOfWeek":"[[ function params=0 ]]"},1,5]
[{"getDayOfWeek":"[[ function params=0 ]]"},3,1]