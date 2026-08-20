// Example

export const Throw = React.lazy(() => {
  throw new Error('Example');
});

export const Component = React.memo(function Component({children}) {
  return children;
});

export function DisplayName({children}) {
  return children;
}
DisplayName.displayName = 'Custom Name';

export class NativeClass extends React.Component {
  render() {
    return this.props.children;
  }
}

export class FrozenClass extends React.Component {
  constructor() {
    super();
  }
  render() {
    return this.props.children;
  }
}
Object.freeze(FrozenClass.prototype);
