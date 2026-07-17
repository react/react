// @flow @compilationMode:"syntax"
// Component declarations nested inside object method bodies should be found
export const examples = [
  {
    title: 'Example 1',
    render(): React.MixedElement {
      component Demo1() {
        const x = useFoo();
        return <div>{x}</div>;
      }
      return <Demo1 />;
    },
  },
  {
    title: 'Example 2',
    render(): React.MixedElement {
      component Demo2() {
        const y = useBar();
        return <span>{y}</span>;
      }
      return <Demo2 />;
    },
  },
];
