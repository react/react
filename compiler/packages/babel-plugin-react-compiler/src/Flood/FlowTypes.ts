/**
 * TypeScript definitions for Flow type JSON representations
 * Based on the output of /data/sandcastle/boxes/fbsource/fbcode/flow/src/typing/convertTypes.ml
 */

// Base type for all Flow types with a kind field
export interface BaseFlowType {
  kind: string;
}

// Type for representing polarity
export type Polarity = 'positive' | 'negative' | 'neutral';

// Type for representing a name that might be null
export type OptionalName = string | null;

// Open type
export interface OpenType extends BaseFlowType {
  kind: 'Open';
}

// Def type
export interface DefType extends BaseFlowType {
  kind: 'Def';
  def: DefT;
}

// Eval type
export interface EvalType extends BaseFlowType {
  kind: 'Eval';
  type: FlowType;
  destructor: Destructor;
}

// Generic type
export interface GenericType extends BaseFlowType {
  kind: 'Generic';
  name: string;
  bound: FlowType;
  no_infer: boolean;
}

// ThisInstance type
export interface ThisInstanceType extends BaseFlowType {
  kind: 'ThisInstance';
  instance: InstanceT;
  is_this: boolean;
  name: string;
}

// ThisTypeApp type
export interface ThisTypeAppType extends BaseFlowType {
  kind: 'ThisTypeApp';
  t1: FlowType;
  t2: FlowType;
  t_list?: Array<FlowType>;
}

// TypeApp type
export interface TypeAppType extends BaseFlowType {
  kind: 'TypeApp';
  type: FlowType;
  targs: Array<FlowType>;
  from_value: boolean;
  use_desc: boolean;
}

// FunProto type
export interface FunProtoType extends BaseFlowType {
  kind: 'FunProto';
}

// ObjProto type
export interface ObjProtoType extends BaseFlowType {
  kind: 'ObjProto';
}

// NullProto type
export interface NullProtoType extends BaseFlowType {
  kind: 'NullProto';
}

// FunProtoBind type
export interface FunProtoBindType extends BaseFlowType {
  kind: 'FunProtoBind';
}

// Intersection type
export interface IntersectionType extends BaseFlowType {
  kind: 'Intersection';
  members: Array<FlowType>;
}

// Union type
export interface UnionType extends BaseFlowType {
  kind: 'Union';
  members: Array<FlowType>;
}

// Maybe type
export interface MaybeType extends BaseFlowType {
  kind: 'Maybe';
  type: FlowType;
}

// Optional type
export interface OptionalType extends BaseFlowType {
  kind: 'Optional';
  type: FlowType;
  use_desc: boolean;
}

// Keys type
export interface KeysType extends BaseFlowType {
  kind: 'Keys';
  type: FlowType;
}

// Annot type
export interface AnnotType extends BaseFlowType {
  kind: 'Annot';
  type: FlowType;
  use_desc: boolean;
}

// Opaque type
export interface OpaqueType extends BaseFlowType {
  kind: 'Opaque';
  opaquetype: {
    opaque_id: string;
    underlying_t: FlowType | null;
    super_t: FlowType | null;
    opaque_type_args: Array<{
      name: string;
      type: FlowType;
      polarity: Polarity;
    }>;
    opaque_name: string;
  };
}

// Namespace type
export interface NamespaceType extends BaseFlowType {
  kind: 'Namespace';
  namespace_symbol: {
    symbol: string;
  };
  values_type: FlowType;
  types_tmap: PropertyMap;
}

// Any type
export interface AnyType extends BaseFlowType {
  kind: 'Any';
}

// StrUtil type
export interface StrUtilType extends BaseFlowType {
  kind: 'StrUtil';
  op: 'StrPrefix' | 'StrSuffix';
  prefix?: string;
  suffix?: string;
  remainder?: FlowType;
}

// TypeParam definition
export interface TypeParam {
  name: string;
  bound: FlowType;
  polarity: Polarity;
  default: FlowType | null;
}

// EnumInfo types
export type EnumInfo = ConcreteEnum | AbstractEnum;

export interface ConcreteEnum {
  kind: 'ConcreteEnum';
  enum_name: string;
  enum_id: string;
  members: Array<string>;
  representation_t: FlowType;
  has_unknown_members: boolean;
}

export interface AbstractEnum {
  kind: 'AbstractEnum';
  representation_t: FlowType;
}

// CanonicalRendersForm types
export type CanonicalRendersForm =
  | InstrinsicRenders
  | NominalRenders
  | StructuralRenders
  | DefaultRenders;

export interface InstrinsicRenders {
  kind: 'InstrinsicRenders';
  name: string;
}

export interface NominalRenders {
  kind: 'NominalRenders';
  renders_id: string;
  renders_name: string;
  renders_super: FlowType;
}

export interface StructuralRenders {
  kind: 'StructuralRenders';
  renders_variant: 'RendersNormal' | 'RendersMaybe' | 'RendersStar';
  renders_structural_type: FlowType;
}

export interface DefaultRenders {
  kind: 'DefaultRenders';
}

// InstanceT definition
export interface InstanceT {
  inst: InstType;
  static: FlowType;
  super: FlowType;
  implements: Array<FlowType>;
}

// InstType definition
export interface InstType {
  class_name: string | null;
  class_id: string;
  type_args: Array<{
    name: string;
    type: FlowType;
    polarity: Polarity;
  }>;
  own_props: PropertyMap;
  proto_props: PropertyMap;
  call_t: null | {
    id: number;
    call: FlowType;
  };
}

// DefT types
export type DefT =
  | NumGeneralType
  | StrGeneralType
  | BoolGeneralType
  | BigIntGeneralType
  | EmptyType
  | MixedType
  | NullType
  | VoidType
  | SymbolType
  | FunType
  | ObjType
  | ArrType
  | ClassType
  | InstanceType
  | SingletonStrType
  | NumericStrKeyType
  | SingletonNumType
  | SingletonBoolType
  | SingletonBigIntType
  | TypeType
  | PolyType
  | ReactAbstractComponentType
  | RendersType
  | EnumValueType
  | EnumObjectType;

export interface NumGeneralType extends BaseFlowType {
  kind: 'NumGeneral';
}

export interface StrGeneralType extends BaseFlowType {
  kind: 'StrGeneral';
}

export interface BoolGeneralType extends BaseFlowType {
  kind: 'BoolGeneral';
}

export interface BigIntGeneralType extends BaseFlowType {
  kind: 'BigIntGeneral';
}

export interface EmptyType extends BaseFlowType {
  kind: 'Empty';
}

export interface MixedType extends BaseFlowType {
  kind: 'Mixed';
}

export interface NullType extends BaseFlowType {
  kind: 'Null';
}

export interface VoidType extends BaseFlowType {
  kind: 'Void';
}

export interface SymbolType extends BaseFlowType {
  kind: 'Symbol';
}

export interface FunType extends BaseFlowType {
  kind: 'Fun';
  static: FlowType;
  funtype: FunTypeObj;
}

export interface ObjType extends BaseFlowType {
  kind: 'Obj';
  objtype: ObjTypeObj;
}

export interface ArrType extends BaseFlowType {
  kind: 'Arr';
  arrtype: ArrTypeObj;
}

export interface ClassType extends BaseFlowType {
  kind: 'Class';
  type: FlowType;
}

export interface InstanceType extends BaseFlowType {
  kind: 'Instance';
  instance: InstanceT;
}

export interface SingletonStrType extends BaseFlowType {
  kind: 'SingletonStr';
  from_annot: boolean;
  value: string;
}

export interface NumericStrKeyType extends BaseFlowType {
  kind: 'NumericStrKey';
  number: string;
  string: string;
}

export interface SingletonNumType extends BaseFlowType {
  kind: 'SingletonNum';
  from_annot: boolean;
  number: string;
  string: string;
}

export interface SingletonBoolType extends BaseFlowType {
  kind: 'SingletonBool';
  from_annot: boolean;
  value: boolean;
}

export interface SingletonBigIntType extends BaseFlowType {
  kind: 'SingletonBigInt';
  from_annot: boolean;
  value: string;
}

export interface TypeType extends BaseFlowType {
  kind: 'Type';
  type_kind: TypeTKind;
  type: FlowType;
}

export type TypeTKind =
  | 'TypeAliasKind'
  | 'TypeParamKind'
  | 'OpaqueKind'
  | 'ImportTypeofKind'
  | 'ImportClassKind'
  | 'ImportEnumKind'
  | 'InstanceKind'
  | 'RenderTypeKind';

export interface PolyType extends BaseFlowType {
  kind: 'Poly';
  tparams: Array<TypeParam>;
  t_out: FlowType;
  id: string;
}

export interface ReactAbstractComponentType extends BaseFlowType {
  kind: 'ReactAbstractComponent';
  config: FlowType;
  renders: FlowType;
  instance: ComponentInstance;
  component_kind: ComponentKind;
}

export type ComponentInstance =
  | {kind: 'RefSetterProp'; type: FlowType}
  | {kind: 'Omitted'};

export type ComponentKind =
  | {kind: 'Structural'}
  | {kind: 'Nominal'; id: string; name: string; types: Array<FlowType> | null};

export interface RendersType extends BaseFlowType {
  kind: 'Renders';
  form: CanonicalRendersForm;
}

export interface EnumValueType extends BaseFlowType {
  kind: 'EnumValue';
  enum_info: EnumInfo;
}

export interface EnumObjectType extends BaseFlowType {
  kind: 'EnumObject';
  enum_value_t: FlowType;
  enum_info: EnumInfo;
}

// ObjKind types
export type ObjKind =
  | {kind: 'Exact'}
  | {kind: 'Inexact'}
  | {kind: 'Indexed'; dicttype: DictType};

// DictType definition
export interface DictType {
  dict_name: string | null;
  key: FlowType;
  value: FlowType;
  dict_polarity: Polarity;
}

// ArrType types
export type ArrTypeObj = ArrayAT | TupleAT | ROArrayAT;

export interface ArrayAT {
  kind: 'ArrayAT';
  elem_t: FlowType;
}

export interface TupleAT {
  kind: 'TupleAT';
  elem_t: FlowType;
  elements: Array<TupleElement>;
  min_arity: number;
  max_arity: number;
  inexact: boolean;
}

export interface ROArrayAT {
  kind: 'ROArrayAT';
  elem_t: FlowType;
}

// TupleElement definition
export interface TupleElement {
  name: string | null;
  t: FlowType;
  polarity: Polarity;
  optional: boolean;
}

// Flags definition
export interface Flags {
  obj_kind: ObjKind;
}

// Property types
export type Property =
  | FieldProperty
  | GetProperty
  | SetProperty
  | GetSetProperty
  | MethodProperty;

export interface FieldProperty {
  kind: 'Field';
  type: FlowType;
  polarity: Polarity;
}

export interface GetProperty {
  kind: 'Get';
  type: FlowType;
}

export interface SetProperty {
  kind: 'Set';
  type: FlowType;
}

export interface GetSetProperty {
  kind: 'GetSet';
  get_type: FlowType;
  set_type: FlowType;
}

export interface MethodProperty {
  kind: 'Method';
  type: FlowType;
}

// PropertyMap definition
export interface PropertyMap {
  [key: string]: Property; // For other properties in the map
}

// ObjType definition
export interface ObjTypeObj {
  flags: Flags;
  props: PropertyMap;
  proto_t: FlowType;
  call_t: number | null;
}

// FunType definition
export interface FunTypeObj {
  this_t: {
    type: FlowType;
    status: ThisStatus;
  };
  params: Array<{
    name: string | null;
    type: FlowType;
  }>;
  rest_param: null | {
    name: string | null;
    type: FlowType;
  };
  return_t: FlowType;
  type_guard: null | {
    inferred: boolean;
    param_name: string;
    type_guard: FlowType;
    one_sided: boolean;
  };
  effect: Effect;
}

// ThisStatus types
export type ThisStatus =
  | {kind: 'This_Method'; unbound: boolean}
  | {kind: 'This_Function'};

// Effect types
export type Effect =
  | {kind: 'HookDecl'; id: string}
  | {kind: 'HookAnnot'}
  | {kind: 'ArbitraryEffect'}
  | {kind: 'AnyEffect'};

// Destructor types
export type Destructor =
  | NonMaybeTypeDestructor
  | PropertyTypeDestructor
  | ElementTypeDestructor
  | OptionalIndexedAccessNonMaybeTypeDestructor
  | OptionalIndexedAccessResultTypeDestructor
  | ExactTypeDestructor
  | ReadOnlyTypeDestructor
  | PartialTypeDestructor
  | RequiredTypeDestructor
  | SpreadTypeDestructor
  | SpreadTupleTypeDestructor
  | RestTypeDestructor
  | ValuesTypeDestructor
  | ConditionalTypeDestructor
  | TypeMapDestructor
  | ReactElementPropsTypeDestructor
  | ReactElementConfigTypeDestructor
  | ReactCheckComponentConfigDestructor
  | ReactDRODestructor
  | MakeHooklikeDestructor
  | MappedTypeDestructor
  | EnumTypeDestructor;

export interface NonMaybeTypeDestructor {
  kind: 'NonMaybeType';
}

export interface PropertyTypeDestructor {
  kind: 'PropertyType';
  name: string;
}

export interface ElementTypeDestructor {
  kind: 'ElementType';
  index_type: FlowType;
}

export interface OptionalIndexedAccessNonMaybeTypeDestructor {
  kind: 'OptionalIndexedAccessNonMaybeType';
  index: OptionalIndexedAccessIndex;
}

export type OptionalIndexedAccessIndex =
  | {kind: 'StrLitIndex'; name: string}
  | {kind: 'TypeIndex'; type: FlowType};

export interface OptionalIndexedAccessResultTypeDestructor {
  kind: 'OptionalIndexedAccessResultType';
}

export interface ExactTypeDestructor {
  kind: 'ExactType';
}

export interface ReadOnlyTypeDestructor {
  kind: 'ReadOnlyType';
}

export interface PartialTypeDestructor {
  kind: 'PartialType';
}

export interface RequiredTypeDestructor {
  kind: 'RequiredType';
}

export interface SpreadTypeDestructor {
  kind: 'SpreadType';
  target: SpreadTarget;
  operands: Array<SpreadOperand>;
  operand_slice: Slice | null;
}

export type SpreadTarget =
  | {kind: 'Value'; make_seal: 'Sealed' | 'Frozen' | 'As_Const'}
  | {kind: 'Annot'; make_exact: boolean};

export type SpreadOperand = {kind: 'Type'; type: FlowType} | Slice;

export interface Slice {
  kind: 'Slice';
  prop_map: PropertyMap;
  generics: Array<string>;
  dict: DictType | null;
  reachable_targs: Array<{
    type: FlowType;
    polarity: Polarity;
  }>;
}

export interface SpreadTupleTypeDestructor {
  kind: 'SpreadTupleType';
  inexact: boolean;
  resolved_rev: string;
  unresolved: string;
}

export interface RestTypeDestructor {
  kind: 'RestType';
  merge_mode: RestMergeMode;
  type: FlowType;
}

export type RestMergeMode =
  | {kind: 'SpreadReversal'}
  | {kind: 'ReactConfigMerge'; polarity: Polarity}
  | {kind: 'Omit'};

export interface ValuesTypeDestructor {
  kind: 'ValuesType';
}

export interface ConditionalTypeDestructor {
  kind: 'ConditionalType';
  distributive_tparam_name: string | null;
  infer_tparams: string;
  extends_t: FlowType;
  true_t: FlowType;
  false_t: FlowType;
}

export interface TypeMapDestructor {
  kind: 'ObjectKeyMirror';
}

export interface ReactElementPropsTypeDestructor {
  kind: 'ReactElementPropsType';
}

export interface ReactElementConfigTypeDestructor {
  kind: 'ReactElementConfigType';
}

export interface ReactCheckComponentConfigDestructor {
  kind: 'ReactCheckComponentConfig';
  props: {
    [key: string]: Property;
  };
}

export interface ReactDRODestructor {
  kind: 'ReactDRO';
  dro_type:
    | 'HookReturn'
    | 'HookArg'
    | 'Props'
    | 'ImmutableAnnot'
    | 'DebugAnnot';
}

export interface MakeHooklikeDestructor {
  kind: 'MakeHooklike';
}

export interface MappedTypeDestructor {
  kind: 'MappedType';
  homomorphic: Homomorphic;
  distributive_tparam_name: string | null;
  property_type: FlowType;
  mapped_type_flags: {
    variance: Polarity;
    optional: 'MakeOptional' | 'RemoveOptional' | 'KeepOptionality';
  };
}

export type Homomorphic =
  | {kind: 'Homomorphic'}
  | {kind: 'Unspecialized'}
  | {kind: 'SemiHomomorphic'; type: FlowType};

export interface EnumTypeDestructor {
  kind: 'EnumType';
}

// Union of all possible Flow types
export type FlowType =
  | OpenType
  | DefType
  | EvalType
  | GenericType
  | ThisInstanceType
  | ThisTypeAppType
  | TypeAppType
  | FunProtoType
  | ObjProtoType
  | NullProtoType
  | FunProtoBindType
  | IntersectionType
  | UnionType
  | MaybeType
  | OptionalType
  | KeysType
  | AnnotType
  | OpaqueType
  | NamespaceType
  | AnyType
  | StrUtilType;
