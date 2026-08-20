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
