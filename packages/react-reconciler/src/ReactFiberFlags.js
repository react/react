/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  enableCreateEventHandleAPI,
  enableEffectEventMutationPhase,
  enableViewTransitionForPersistenceMode,
} from 'shared/ReactFeatureFlags';

export type Flags = number;

// Don't change these values. They're used by React Dev Tools.
export const NoFlags = /*                      */ 0b0000000000000000000000000000000;
export const PerformedWork = /*                */ 0b0000000000000000000000000000001;
export const Placement = /*                    */ 0b0000000000000000000000000000010;
export const DidCapture = /*                   */ 0b0000000000000000000000010000000;
export const Hydrating = /*                    */ 0b0000000000000000001000000000000;

// You can change the rest (and add more).
export const Update = /*                       */ 0b0000000000000000000000000000100;
export const Cloned = /*                       */ 0b0000000000000000000000000001000;

export const ChildDeletion = /*                */ 0b0000000000000000000000000010000;
export const ContentReset = /*                 */ 0b0000000000000000000000000100000;
export const Callback = /*                     */ 0b0000000000000000000000001000000;
/* Used by DidCapture:                            0b0000000000000000000000010000000; */

export const ForceClientRender = /*            */ 0b0000000000000000000000100000000;
export const Ref = /*                          */ 0b0000000000000000000001000000000;
export const Snapshot = /*                     */ 0b0000000000000000000010000000000;
export const Passive = /*                      */ 0b0000000000000000000100000000000;
/* Used by Hydrating:                             0b0000000000000000001000000000000; */

export const Visibility = /*                   */ 0b0000000000000000010000000000000;
export const StoreConsistency = /*             */ 0b0000000000000000100000000000000;

// It's OK to reuse these bits because these flags are mutually exclusive for
// different fiber types. We should really be doing this for as many flags as
// possible, because we're about to run out of bits.
export const Hydrate = Callback;
export const ScheduleRetry = StoreConsistency;
export const ShouldSuspendCommit = Visibility;
export const ViewTransitionNamedMount = ShouldSuspendCommit;
export const DidDefer = ContentReset;
export const FormReset = Snapshot;
export const AffectedParentLayout = ContentReset;

export const LifecycleEffectMask =
  Passive | Update | Callback | Ref | Snapshot | StoreConsistency;

// Union of all commit flags (flags with the lifetime of a particular commit)
export const HostEffectMask = /*               */ 0b0000000000000000111111111111111;

// These are not really side effects, but we still reuse this field.
export const Incomplete = /*                   */ 0b0000000000000001000000000000000;
export const ShouldCapture = /*                */ 0b0000000000000010000000000000000;
export const ForceUpdateForLegacySuspense = /* */ 0b0000000000000100000000000000000;
export const DidPropagateContext = /*          */ 0b0000000000001000000000000000000;
export const NeedsPropagation = /*             */ 0b0000000000010000000000000000000;

// Static tags describe aspects of a fiber that are not specific to a render,
// e.g. a fiber uses a passive effect (even if there are no updates on this particular render).
// This enables us to defer more work in the unmount case,
// since we can defer traversing the tree during layout to look for Passive effects,
// and instead rely on the static flag as a signal that there may be cleanup work.
export const Forked = /*                       */ 0b0000000000100000000000000000000;
export const SnapshotStatic = /*               */ 0b0000000001000000000000000000000;
export const LayoutStatic = /*                 */ 0b0000000010000000000000000000000;
export const RefStatic = LayoutStatic;
export const PassiveStatic = /*                */ 0b0000000100000000000000000000000;
export const MaySuspendCommit = /*             */ 0b0000001000000000000000000000000;
// ViewTransitionNamedStatic tracks explicitly name ViewTransition components deeply
// that might need to be visited during clean up. This is similar to SnapshotStatic
// if there was any other use for it. It also needs to run in the same phase as
// MaySuspendCommit tracking.
export const ViewTransitionNamedStatic =
  /*    */ SnapshotStatic | MaySuspendCommit;
// ViewTransitionStatic tracks whether there are an ViewTransition components from
// the nearest HostComponent down. It resets at every HostComponent level.
export const ViewTransitionStatic = /*         */ 0b0000010000000000000000000000000;
// ViewTransitionStaticParent tracks whether there are ViewTransition components
// with parentEnter/parentExit props. Unlike ViewTransitionStatic, this is NOT
// cleared by HostComponents so it can be used to skip subtrees in parent walks.
export const ViewTransitionStaticParent = /*   */ 0b1000000000000000000000000000000;
// Tracks whether a HostPortal is present in the tree.
export const PortalStatic = /*                 */ 0b0000100000000000000000000000000;

// Flag used to identify newly inserted fibers. It isn't reset after commit unlike `Placement`.
export const PlacementDEV = /*                 */ 0b0001000000000000000000000000000;
export const MountLayoutDev = /*               */ 0b0010000000000000000000000000000;
export const MountPassiveDev = /*              */ 0b0100000000000000000000000000000;

// Groups of flags that are used in the commit phase to skip over trees that
// don't contain effects, by checking subtreeFlags.

export const BeforeMutationMask: number =
  Snapshot |
  (enableCreateEventHandleAPI
    ? // createEventHandle needs to visit deleted and hidden trees to
      // fire beforeblur
      // TODO: Only need to visit Deletions during BeforeMutation phase if an
      // element is focused.
      Update | ChildDeletion | Visibility
    : // useEffectEvent uses the snapshot phase,
      // but we're moving it to the mutation phase.
      enableEffectEventMutationPhase
      ? 0
      : Update);

// For View Transition support we use the snapshot phase to scan the tree for potentially
// affected ViewTransition components.
export const BeforeAndAfterMutationTransitionMask: number =
  Snapshot |
  Update |
  Placement |
  ChildDeletion |
  Visibility |
  ContentReset |
  (enableViewTransitionForPersistenceMode ? Cloned : 0);

export const MutationMask =
  Placement |
  Update |
  ChildDeletion |
  ContentReset |
  Ref |
  Hydrating |
  Visibility |
  FormReset;
export const LayoutMask = Update | Callback | Ref | Visibility;

// TODO: Split into PassiveMountMask and PassiveUnmountMask
export const PassiveMask = Passive | Visibility | ChildDeletion;

// For View Transitions we need to visit anything we visited in the snapshot phase to
// restore the view-transition-name after committing the transition.
export const PassiveTransitionMask: number = PassiveMask | Update | Placement;

// Union of tags that don't get reset on clones.
// This allows certain concepts to persist without recalculating them,
// e.g. whether a subtree contains passive effects or portals.
export const StaticMask =
  LayoutStatic |
  PassiveStatic |
  RefStatic |
  MaySuspendCommit |
  ViewTransitionStatic |
  ViewTransitionStaticParent |
  ViewTransitionNamedStatic |
  PortalStatic |
  Forked;
