// flow-typed signature: 4631a74b6a0e6a1b4de2ba8c7bb141d6
// flow-typed version: 3e51657e95/web-animations/flow_>=v0.261.x

// https://www.w3.org/TR/web-animations-1/

type AnimationPlayState = 'idle' | 'running' | 'paused' | 'finished';

type AnimationReplaceState = 'active' | 'removed' | 'persisted';

type CompositeOperation = 'replace' | 'add' | 'accumulate';

type CompositeOperationOrAuto = 'replace' | 'add' | 'accumulate' | 'auto';

type FillMode = 'none' | 'forwards' | 'backwards' | 'both' | 'auto';

// This is actually web-animations-2
type IterationCompositeOperation = 'replace' | 'accumulate';

type PlaybackDirection =
  | 'normal'
  | 'reverse'
  | 'alternate'
  | 'alternate-reverse';

type AnimationPlaybackEvent$Init = Event$Init & {
  currentTime?: number | null,
  timelineTime?: number | null,
  ...
};

type BaseComputedKeyframe = {|
  composite: CompositeOperationOrAuto,
  computedOffset: number,
  easing: string,
  offset: number | null,
|};

type BaseKeyframe = {|
  composite: CompositeOperationOrAuto,
  easing: string,
  offset: number | null,
|};

type BasePropertyIndexedKeyframe = {|
  composite: CompositeOperationOrAuto | Array<CompositeOperationOrAuto>,
  easing: string | Array<string>,
  offset: number | null | Array<number | null>,
|};

type ComputedEffectTiming = {|
  ...EffectTiming,
  currentIteration: number | null,
  progress: number | null,
|};

type ComputedKeyframe = {
  composite: CompositeOperationOrAuto,
  computedOffset: number,
  easing: string,
  offset: number | null,
  [property: string]: string | number | null | void,
  ...
};

type DocumentTimelineOptions = {|
  originTime: number,
|};

type EffectTiming = {|
  direction: PlaybackDirection,
  easing: string,
  fill: FillMode,
  iterations: number,
  iterationStart: number,
|};

type GetAnimationsOptions = {|
  pseudoElement: string | null,
  subtree: boolean,
|};

type KeyframeAnimationOptions = {|
  ...KeyframeEffectOptions,
  id: string,
  timeline: AnimationTimeline | null,
|};

type KeyframeEffectOptions = {|
  ...EffectTiming,
  composite: CompositeOperation,
  pseudoElement: string | null,
|};

type Keyframe = {
  composite?: CompositeOperationOrAuto,
  easing?: string,
  offset?: number | null,
  [property: string]: string | number | null | void,
  ...
};

type OptionalEffectTiming = Partial<EffectTiming>;

type PropertyIndexedKeyframes = {
  composite?: CompositeOperationOrAuto | CompositeOperationOrAuto[],
  easing?: string | string[],
  offset?: number | (number | null)[],
  [property: string]:
    | string
    | string[]
    | number
    | null
    | (number | null)[]
    | void,
  ...
};

declare class Animation extends EventTarget {
  constructor(
    effect?: AnimationEffect | null,
    timeline?: AnimationTimeline | null
  ): void;

  id: string;
  effect: AnimationEffect | null;
  timeline: AnimationTimeline | null;
  startTime: number | null;
  currentTime: number | null;
  playbackRate: number;
  +playState: AnimationPlayState;
  +replaceState: AnimationReplaceState;
  +pending: boolean;
  +ready: Promise<Animation>;
  +finished: Promise<Animation>;
  onfinish: ?(ev: AnimationPlaybackEvent) => mixed;
  oncancel: ?(ev: AnimationPlaybackEvent) => mixed;
  onremove: ?(ev: AnimationPlaybackEvent) => mixed;
  cancel(): void;
  finish(): void;
  play(): void;
  pause(): void;
  updatePlaybackRate(playbackRate: number): void;
  reverse(): void;
  persist(): void;
  commitStyles(): void;
}

declare class AnimationEffect {
  getTiming(): EffectTiming;
  getComputedTiming(): ComputedEffectTiming;
  updateTiming(timing?: OptionalEffectTiming): void;
}

declare class AnimationPlaybackEvent extends Event {
  constructor(
    type: string,
    animationEventInitDict?: AnimationPlaybackEvent$Init
  ): void;
  +currentTime: number | null;
  +timelineTime: number | null;
}

declare class AnimationTimeline {
  +currentTime: number | null;
}

declare class DocumentTimeline extends AnimationTimeline {
  constructor(options?: DocumentTimelineOptions): void;
}

declare class KeyframeEffect extends AnimationEffect {
  constructor(
    target: Element | null,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeEffectOptions
  ): void;
  constructor(source: KeyframeEffect): void;

  target: Element | null;
  composite: CompositeOperation;
  // This is actually web-animations-2
  iterationComposite: IterationCompositeOperation;
  getKeyframes(): ComputedKeyframe[];
  setKeyframes(keyframes: Keyframe[] | PropertyIndexedKeyframes | null): void;
}

declare class mixin$Animatable {
  animate(
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions
  ): Animation;
  getAnimations(options?: GetAnimationsOptions): Array<Animation>;
}
