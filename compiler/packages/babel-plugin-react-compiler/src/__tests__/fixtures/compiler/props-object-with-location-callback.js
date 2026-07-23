function MiniCarousel(props) {
  return <div>{props.cards.length}</div>;
}

function Component(props) {
  const cardListTransformed = props.cards.map(card => ({
    ...card,
    slug: card.slug.toLowerCase(),
  }));
  const miniCarouselProps = {
    ...props,
    cards: cardListTransformed,
    slug: props.locationSlug,
    onCardClick: card => {
      location.pathname = card.slug;
    },
    forceAnchorTag: false,
  };

  return <MiniCarousel {...miniCarouselProps} />;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{cards: [{slug: 'A'}], locationSlug: 'home'}],
};
