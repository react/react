function DateComponent({date}) {
  const formatter = new Intl.DateTimeFormat('en-US');

  return <time dateTime={date.toISOString()}>{formatter.format(date)}</time>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: DateComponent,
  params: [{date: new Date('2024-01-01')}],
};
