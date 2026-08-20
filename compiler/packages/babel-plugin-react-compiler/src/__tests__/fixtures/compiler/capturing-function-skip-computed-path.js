function StoreLandingUnseenGiftModalContainer(a) {
  const giftsSeen = {a};
  return (gift => (gift.id ? giftsSeen[gift.id] : false))();
}

export const FIXTURE_ENTRYPOINT = {
  fn: StoreLandingUnseenGiftModalContainer,
  params: ['TodoAdd'],
  isComponent: 'TodoAdd',
};
