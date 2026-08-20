
## Input

```javascript
function Component(props) {
  const user =
    useFragment(
      graphql`
        fragment F on T {
          id
        }
      `,
      props.user
    ) ?? {};
  return user.name;
}

```

## Code

```javascript
function Component(props) {
  const user =
    useFragment(
      graphql`
        fragment F on T {
          id
        }
      `,
      props.user,
    ) ?? {};
  return user.name;
}

```
      