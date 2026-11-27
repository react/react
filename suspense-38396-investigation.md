# Suspense retry investigation — react/react#38396

This branch is an investigation, not a verified bug fix.

## Evidence

The reported same-lane retry timer hypothesis was tested on main (base edae846a9a17442c00429f2b15375afbfa0376c9) and v19.2.4. Both original implementations pass all three characterization tests, including a synthetic same-lane ping before the throttle deadline and after the scheduler clock passes the deadline but before host timers execute.

- [Initial comparison](https://github.com/ietuday/react/actions/runs/45954872342)
- [Same-lane ping comparison](https://github.com/ietuday/react/actions/runs/45955236815)
- [Immediate commit comparison](https://github.com/ietuday/react/actions/runs/45955507476)
- [Release comparison](https://github.com/ietuday/react/actions/runs/45955789356): 122 main baseline, 122 candidate, 144 release baseline test executions passed.

Completed renders reset workInProgressRoot and workInProgressRootRenderLanes. A subsequent render prepares a fresh stack, which cancels the pending timeout. The candidate timer guards have not been shown to be necessary.

## Remaining investigation

Obtain a minimal application-level reproduction with the actual renderer, feature flags, and stack trace. Distinguish timer replacement from reentrant commits while flushing passive effects (see react/react#37762, #37793, #37812). A matching error message does not establish a matching root cause.

Do not submit the candidate as a fix until a regression fails on unmodified React and passes with the patch. The fork-only workflow and this note are not intended for an upstream patch.
