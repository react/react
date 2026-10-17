function SignedZero({negative}) {
  'use memo';
  let value;
  if (negative) {
    value = -0;
  } else {
    value = 0;
  }
  return 1 / value < 0 ? 'negative' : 'positive';
}

export const FIXTURE_ENTRYPOINT = {
  fn: SignedZero,
  params: [{negative: false}],
  sequentialRenders: [{negative: false}, {negative: true}],
};
