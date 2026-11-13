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
