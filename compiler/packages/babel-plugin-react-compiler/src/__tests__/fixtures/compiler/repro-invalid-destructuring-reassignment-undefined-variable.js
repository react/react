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
