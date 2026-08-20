/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {isValidIdentifier} from '@babel/types';
import {z} from 'zod/v4';
import {Effect, ValueKind} from '..';
import {
  EffectSchema,
  ValueKindSchema,
  ValueReason,
  ValueReasonSchema,
} from './HIR';

export type ObjectPropertiesConfig = {[key: string]: TypeConfig};
export const ObjectPropertiesSchema: z.ZodType<ObjectPropertiesConfig> = z
  .record(
    z.string(),
    z.lazy(() => TypeSchema),
  )
  .refine(record => {
    return Object.keys(record).every(
      key => key === '*' || key === 'default' || isValidIdentifier(key),
    );
  }, 'Expected all "object" property names to be valid identifier, `*` to match any property, of `default` to define a module default export');

export type ObjectTypeConfig = {
  kind: 'object';
  properties: ObjectPropertiesConfig | null;
};
export const ObjectTypeSchema: z.ZodType<ObjectTypeConfig> = z.object({
  kind: z.literal('object'),
  properties: ObjectPropertiesSchema.nullable(),
});

export const LifetimeIdSchema = z.string().refine(id => id.startsWith('@'), {
  message: "Placeholder names must start with '@'",
});

export type FreezeEffectConfig = {
  kind: 'Freeze';
  value: string;
  reason: ValueReason;
};

export const FreezeEffectSchema: z.ZodType<FreezeEffectConfig> = z.object({
  kind: z.literal('Freeze'),
  value: LifetimeIdSchema,
  reason: ValueReasonSchema,
});

export type MutateEffectConfig = {
  kind: 'Mutate';
  value: string;
};

export const MutateEffectSchema: z.ZodType<MutateEffectConfig> = z.object({
  kind: z.literal('Mutate'),
  value: LifetimeIdSchema,
});

export type MutateTransitiveConditionallyConfig = {
  kind: 'MutateTransitiveConditionally';
  value: string;
};

export const MutateTransitiveConditionallySchema: z.ZodType<MutateTransitiveConditionallyConfig> =
  z.object({
    kind: z.literal('MutateTransitiveConditionally'),
    value: LifetimeIdSchema,
  });

export type CreateEffectConfig = {
  kind: 'Create';
  into: string;
  value: ValueKind;
  reason: ValueReason;
};

export const CreateEffectSchema: z.ZodType<CreateEffectConfig> = z.object({
  kind: z.literal('Create'),
  into: LifetimeIdSchema,
  value: ValueKindSchema,
  reason: ValueReasonSchema,
});

export type AssignEffectConfig = {
  kind: 'Assign';
  from: string;
  into: string;
};

export const AssignEffectSchema: z.ZodType<AssignEffectConfig> = z.object({
  kind: z.literal('Assign'),
  from: LifetimeIdSchema,
  into: LifetimeIdSchema,
});

export type AliasEffectConfig = {
  kind: 'Alias';
  from: string;
  into: string;
};

export const AliasEffectSchema: z.ZodType<AliasEffectConfig> = z.object({
  kind: z.literal('Alias'),
  from: LifetimeIdSchema,
  into: LifetimeIdSchema,
});

export type ImmutableCaptureEffectConfig = {
  kind: 'ImmutableCapture';
  from: string;
  into: string;
};

export const ImmutableCaptureEffectSchema: z.ZodType<ImmutableCaptureEffectConfig> =
  z.object({
    kind: z.literal('ImmutableCapture'),
    from: LifetimeIdSchema,
    into: LifetimeIdSchema,
  });

export type CaptureEffectConfig = {
  kind: 'Capture';
  from: string;
  into: string;
};

export const CaptureEffectSchema: z.ZodType<CaptureEffectConfig> = z.object({
  kind: z.literal('Capture'),
  from: LifetimeIdSchema,
  into: LifetimeIdSchema,
});

export type CreateFromEffectConfig = {
  kind: 'CreateFrom';
  from: string;
  into: string;
};

export const CreateFromEffectSchema: z.ZodType<CreateFromEffectConfig> =
  z.object({
    kind: z.literal('CreateFrom'),
    from: LifetimeIdSchema,
    into: LifetimeIdSchema,
  });

export type ApplyArgConfig =
  | string
  | {kind: 'Spread'; place: string}
  | {kind: 'Hole'};

export const ApplyArgSchema: z.ZodType<ApplyArgConfig> = z.union([
  LifetimeIdSchema,
  z.object({
    kind: z.literal('Spread'),
    place: LifetimeIdSchema,
  }),
  z.object({
    kind: z.literal('Hole'),
  }),
]);

export type ApplyEffectConfig = {
  kind: 'Apply';
  receiver: string;
  function: string;
  mutatesFunction: boolean;
  args: Array<ApplyArgConfig>;
  into: string;
};

export const ApplyEffectSchema: z.ZodType<ApplyEffectConfig> = z.object({
  kind: z.literal('Apply'),
  receiver: LifetimeIdSchema,
  function: LifetimeIdSchema,
  mutatesFunction: z.boolean(),
  args: z.array(ApplyArgSchema),
  into: LifetimeIdSchema,
});

export type ImpureEffectConfig = {
  kind: 'Impure';
  place: string;
};

export const ImpureEffectSchema: z.ZodType<ImpureEffectConfig> = z.object({
  kind: z.literal('Impure'),
  place: LifetimeIdSchema,
});

export type AliasingEffectConfig =
  | FreezeEffectConfig
  | CreateEffectConfig
  | CreateFromEffectConfig
  | AssignEffectConfig
  | AliasEffectConfig
  | CaptureEffectConfig
  | ImmutableCaptureEffectConfig
  | ImpureEffectConfig
  | MutateEffectConfig
  | MutateTransitiveConditionallyConfig
  | ApplyEffectConfig;

export const AliasingEffectSchema: z.ZodType<AliasingEffectConfig> = z.union([
  FreezeEffectSchema,
  CreateEffectSchema,
  CreateFromEffectSchema,
  AssignEffectSchema,
  AliasEffectSchema,
  CaptureEffectSchema,
  ImmutableCaptureEffectSchema,
  ImpureEffectSchema,
  MutateEffectSchema,
  MutateTransitiveConditionallySchema,
  ApplyEffectSchema,
]);

export type AliasingSignatureConfig = {
  receiver: string;
  params: Array<string>;
  rest: string | null;
  returns: string;
  effects: Array<AliasingEffectConfig>;
  temporaries: Array<string>;
};

export const AliasingSignatureSchema: z.ZodType<AliasingSignatureConfig> =
  z.object({
    receiver: LifetimeIdSchema,
    params: z.array(LifetimeIdSchema),
    rest: LifetimeIdSchema.nullable(),
    returns: LifetimeIdSchema,
    effects: z.array(AliasingEffectSchema),
    temporaries: z.array(LifetimeIdSchema),
  });

export type FunctionTypeConfig = {
  kind: 'function';
  positionalParams: Array<Effect>;
  restParam: Effect | null;
  calleeEffect: Effect;
  returnType: TypeConfig;
  returnValueKind: ValueKind;
  noAlias?: boolean | null | undefined;
  mutableOnlyIfOperandsAreMutable?: boolean | null | undefined;
  impure?: boolean | null | undefined;
  canonicalName?: string | null | undefined;
  aliasing?: AliasingSignatureConfig | null | undefined;
  knownIncompatible?: string | null | undefined;
};
export const FunctionTypeSchema: z.ZodType<FunctionTypeConfig> = z.object({
  kind: z.literal('function'),
  positionalParams: z.array(EffectSchema),
  restParam: EffectSchema.nullable(),
  calleeEffect: EffectSchema,
  returnType: z.lazy(() => TypeSchema),
  returnValueKind: ValueKindSchema,
  noAlias: z.boolean().nullable().optional(),
  mutableOnlyIfOperandsAreMutable: z.boolean().nullable().optional(),
  impure: z.boolean().nullable().optional(),
  canonicalName: z.string().nullable().optional(),
  aliasing: AliasingSignatureSchema.nullable().optional(),
  knownIncompatible: z.string().nullable().optional(),
});

export type HookTypeConfig = {
  kind: 'hook';
  positionalParams?: Array<Effect> | null | undefined;
  restParam?: Effect | null | undefined;
  returnType: TypeConfig;
  returnValueKind?: ValueKind | null | undefined;
  noAlias?: boolean | null | undefined;
  aliasing?: AliasingSignatureConfig | null | undefined;
  knownIncompatible?: string | null | undefined;
};
export const HookTypeSchema: z.ZodType<HookTypeConfig> = z.object({
  kind: z.literal('hook'),
  positionalParams: z.array(EffectSchema).nullable().optional(),
  restParam: EffectSchema.nullable().optional(),
  returnType: z.lazy(() => TypeSchema),
  returnValueKind: ValueKindSchema.nullable().optional(),
  noAlias: z.boolean().nullable().optional(),
  aliasing: AliasingSignatureSchema.nullable().optional(),
  knownIncompatible: z.string().nullable().optional(),
});

export type BuiltInTypeConfig =
  | 'Any'
  | 'Ref'
  | 'Array'
  | 'Primitive'
  | 'MixedReadonly';
export const BuiltInTypeSchema: z.ZodType<BuiltInTypeConfig> = z.union([
  z.literal('Any'),
  z.literal('Ref'),
  z.literal('Array'),
  z.literal('Primitive'),
  z.literal('MixedReadonly'),
]);

export type TypeReferenceConfig = {
  kind: 'type';
  name: BuiltInTypeConfig;
};
export const TypeReferenceSchema: z.ZodType<TypeReferenceConfig> = z.object({
  kind: z.literal('type'),
  name: BuiltInTypeSchema,
});

export type TypeConfig =
  | ObjectTypeConfig
  | FunctionTypeConfig
  | HookTypeConfig
  | TypeReferenceConfig;
export const TypeSchema: z.ZodType<TypeConfig> = z.union([
  ObjectTypeSchema,
  FunctionTypeSchema,
  HookTypeSchema,
  TypeReferenceSchema,
]);
