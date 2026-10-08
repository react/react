
## Input

```javascript
function useLocation() {
  return '/x';
}
const TABLE = {k1: {slug: 's1', icon: 'I1'}};
function detect(pathname) {
  return 'k1';
}
function routesFor(slug) {
  return [slug];
}
function nameOf(key) {
  return 'name';
}

function Sidebar({navigation}) {
  const pathname = useLocation();
  const key = detect(pathname);
  const active = key ? TABLE[key] : null;
  const contextNavigation = active ? routesFor(active.slug) : [];
  const effective = navigation ?? contextNavigation;
  const title = key ? nameOf(key) : 'home';
  const Icon = active?.icon;
  return <aside title={title}>{effective.length}</aside>;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Sidebar,
  params: [{navigation: undefined}],
};

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime";
function useLocation() {
  return "/x";
}

const TABLE = { k1: { slug: "s1", icon: "I1" } };
function detect(pathname) {
  return "k1";
}

function routesFor(slug) {
  const $ = _c(2);
  let t0;
  if ($[0] !== slug) {
    t0 = [slug];
    $[0] = slug;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  return t0;
}

function nameOf(key) {
  return "name";
}

function Sidebar(t0) {
  const $ = _c(10);
  const { navigation } = t0;
  const pathname = useLocation();
  let active;
  let effective;
  let t1;
  if ($[0] !== navigation || $[1] !== pathname) {
    const key = detect(pathname);
    active = key ? TABLE[key] : null;
    let t2;
    if ($[5] !== active) {
      t2 = active ? routesFor(active.slug) : [];
      $[5] = active;
      $[6] = t2;
    } else {
      t2 = $[6];
    }
    const contextNavigation = t2;
    effective = navigation ?? contextNavigation;
    t1 = key ? nameOf(key) : "home";
    $[0] = navigation;
    $[1] = pathname;
    $[2] = active;
    $[3] = effective;
    $[4] = t1;
  } else {
    active = $[2];
    effective = $[3];
    t1 = $[4];
  }
  const title = t1;
  active?.icon;
  let t2;
  if ($[7] !== effective.length || $[8] !== title) {
    t2 = <aside title={title}>{effective.length}</aside>;
    $[7] = effective.length;
    $[8] = title;
    $[9] = t2;
  } else {
    t2 = $[9];
  }
  return t2;
}

export const FIXTURE_ENTRYPOINT = {
  fn: Sidebar,
  params: [{ navigation: undefined }],
};

```
      
### Eval output
(kind: ok) <aside title="name">1</aside>