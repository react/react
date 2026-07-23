
## Input

```javascript
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

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function MiniCarousel(props) {
  const $ = _c(2);
  let t0;
  if ($[0] !== props.cards.length) {
    t0 = <div>{props.cards.length}</div>;
    $[0] = props.cards.length;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function Component(props) {
  const $ = _c(6);
  let t0;
  if ($[0] !== props.cards) {
    t0 = props.cards.map(_temp);
    $[0] = props.cards;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const cardListTransformed = t0;
  let t1;
  if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
    t1 = _temp2;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  let t2;
  if ($[3] !== cardListTransformed || $[4] !== props) {
    const miniCarouselProps = {
      ...props,
      cards: cardListTransformed,
      slug: props.locationSlug,
      onCardClick: t1,
      forceAnchorTag: false,
    };
    t2 = <MiniCarousel {...miniCarouselProps} />;
    $[3] = cardListTransformed;
    $[4] = props;
    $[5] = t2;
  } else {
    t2 = $[5];
  }
  return t2;
}
function _temp2(card_0) {
  location.pathname = card_0.slug;
}
function _temp(card) {
  return { ...card, slug: card.slug.toLowerCase() };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{ cards: [{ slug: "A" }], locationSlug: "home" }],
};

```
      
### Eval output
(kind: ok) <div>1</div>