const route = {path: '/home'};

function Component(replacement) {
  return (route &&= replacement());
}
