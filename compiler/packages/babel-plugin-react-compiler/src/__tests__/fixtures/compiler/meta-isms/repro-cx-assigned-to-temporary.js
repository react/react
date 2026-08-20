// @compilationMode:"infer" @enableAssumeHooksFollowRulesOfReact:false @customMacros:"cx"
import {identity} from 'shared-runtime';

const DARK = 'dark';

function Component() {
  const theme = useTheme();
  return (
    <div
      className={cx({
        'styles/light': true,
        'styles/dark': theme.getTheme() === DARK,
      })}
    />
  );
}

function cx(obj) {
  const classes = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value) {
      classes.push(key);
    }
  }
  return classes.join(' ');
}

function useTheme() {
  return {
    getTheme() {
      return DARK;
    },
  };
}

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [{}],
};
