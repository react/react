
## Input

```javascript
// @validateNoSetStateInRender @enableAssumeHooksFollowRulesOfReact
function Component(props) {
  const logEvent = useLogging(props.appId);
  const [currentStep, setCurrentStep] = useState(0);

  // onSubmit gets the same mutable range as `logEvent`, since that is called
  // later. however, our validation uses direct aliasing to track function
  // expressions which are invoked, and understands that this function isn't
  // called during render:
  const onSubmit = errorEvent => {
    logEvent(errorEvent);
    setCurrentStep(1);
  };

  switch (currentStep) {
    case 0:
      return <OtherComponent data={{foo: 'bar'}} />;
    case 1:
      return <OtherComponent data={{foo: 'joe'}} onSubmit={onSubmit} />;
    default:
      // 1. logEvent's mutable range is extended to this instruction
      logEvent('Invalid step');
      return <OtherComponent data={null} />;
  }
}

```

## Code

```javascript
import { c as _c } from "react/compiler-runtime"; // @validateNoSetStateInRender @enableAssumeHooksFollowRulesOfReact
function Component(props) {
  const $ = _c(7);
  const logEvent = useLogging(props.appId);
  const [currentStep, setCurrentStep] = useState(0);
  let t0;
  if ($[0] !== logEvent) {
    t0 = (errorEvent) => {
      logEvent(errorEvent);
      setCurrentStep(1);
    };
    $[0] = logEvent;
    $[1] = t0;
  } else {
    t0 = $[1];
  }
  const onSubmit = t0;

  switch (currentStep) {
    case 0: {
      let t1;
      if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = <OtherComponent data={{ foo: "bar" }} />;
        $[2] = t1;
      } else {
        t1 = $[2];
      }
      return t1;
    }
    case 1: {
      let t1;
      if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = { foo: "joe" };
        $[3] = t1;
      } else {
        t1 = $[3];
      }
      let t2;
      if ($[4] !== onSubmit) {
        t2 = <OtherComponent data={t1} onSubmit={onSubmit} />;
        $[4] = onSubmit;
        $[5] = t2;
      } else {
        t2 = $[5];
      }
      return t2;
    }
    default: {
      logEvent("Invalid step");
      let t1;
      if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = <OtherComponent data={null} />;
        $[6] = t1;
      } else {
        t1 = $[6];
      }
      return t1;
    }
  }
}

```
      