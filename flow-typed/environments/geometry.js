// flow-typed signature: c29a716c1825927cdfc3ad29fe929754
// flow-typed version: 52ab99c6db/geometry/flow_>=v0.261.x

// https://www.w3.org/TR/geometry-1/

type DOMMatrix2DInit =
  | {|
      a: number,
      b: number,
      c: number,
      d: number,
      e: number,
      f: number,
    |}
  | {|
      m11: number,
      m12: number,
      m21: number,
      m22: number,
      m41: number,
      m42: number,
    |};

type DOMMatrixInit =
  | {|
      ...DOMMatrix2DInit,
      is2D: true,
    |}
  | {|
      ...DOMMatrix2DInit,
      is2D: false,
      m13: number,
      m14: number,
      m23: number,
      m24: number,
      m31: number,
      m32: number,
      m33: number,
      m34: number,
      m43: number,
      m44: number,
    |};

type DOMPointInit = {|
  w: number,
  x: number,
  y: number,
  z: number,
|};

type DOMQuadInit = {|
  p1: DOMPointInit,
  p2: DOMPointInit,
  p3: DOMPointInit,
  p4: DOMPointInit,
|};

type DOMRectInit = {|
  height: number,
  width: number,
  x: number,
  y: number,
|};

declare class DOMMatrix extends DOMMatrixReadOnly {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  m11: number;
  m12: number;
  m13: number;
  m14: number;
  m21: number;
  m22: number;
  m23: number;
  m24: number;
  m31: number;
  m32: number;
  m33: number;
  m34: number;
  m41: number;
  m42: number;
  m43: number;
  m44: number;

  static fromFloat32Array(array32: Float32Array): DOMMatrix;
  static fromFloat64Array(array64: Float64Array): DOMMatrix;
  static fromMatrix(other?: DOMMatrixInit): DOMMatrix;

  constructor(init?: string | Array<number>): void;
  invertSelf(): DOMMatrix;
  multiplySelf(other?: DOMMatrixInit): DOMMatrix;
  preMultiplySelf(other?: DOMMatrixInit): DOMMatrix;
  rotateAxisAngleSelf(
    x?: number,
    y?: number,
    z?: number,
    angle?: number
  ): DOMMatrix;
  rotateFromVectorSelf(x?: number, y?: number): DOMMatrix;
  rotateSelf(rotX?: number, rotY?: number, rotZ?: number): DOMMatrix;
  scale3dSelf(
    scale?: number,
    originX?: number,
    originY?: number,
    originZ?: number
  ): DOMMatrix;
  scaleSelf(
    scaleX?: number,
    scaleY?: number,
    scaleZ?: number,
    originX?: number,
    originY?: number,
    originZ?: number
  ): DOMMatrix;
  setMatrixValue(transformList: string): DOMMatrix;
  skewXSelf(sx?: number): DOMMatrix;
  skewYSelf(sy?: number): DOMMatrix;
  translateSelf(tx?: number, ty?: number, tz?: number): DOMMatrix;
}

declare class DOMMatrixReadOnly {
  +a: number;
  +b: number;
  +c: number;
  +d: number;
  +e: number;
  +f: number;
  +is2D: boolean;
  +isIdentity: boolean;
  +m11: number;
  +m12: number;
  +m13: number;
  +m14: number;
  +m21: number;
  +m22: number;
  +m23: number;
  +m24: number;
  +m31: number;
  +m32: number;
  +m33: number;
  +m34: number;
  +m41: number;
  +m42: number;
  +m43: number;
  +m44: number;

  static fromFloat32Array(array32: Float32Array): DOMMatrixReadOnly;
  static fromFloat64Array(array64: Float64Array): DOMMatrixReadOnly;
  static fromMatrix(other?: DOMMatrixInit): DOMMatrixReadOnly;

  constructor(init?: string | Array<number>): void;
  flipX(): DOMMatrix;
  flipY(): DOMMatrix;
  inverse(): DOMMatrix;
  multiply(other?: DOMMatrixInit): DOMMatrix;
  rotate(rotX?: number, rotY?: number, rotZ?: number): DOMMatrix;
  rotateAxisAngle(
    x?: number,
    y?: number,
    z?: number,
    angle?: number
  ): DOMMatrix;
  rotateFromVector(x?: number, y?: number): DOMMatrix;
  scale(
    scaleX?: number,
    scaleY?: number,
    scaleZ?: number,
    originX?: number,
    originY?: number,
    originZ?: number
  ): DOMMatrix;
  scale3d(
    scale?: number,
    originX?: number,
    originY?: number,
    originZ?: number
  ): DOMMatrix;
  scaleNonUniform(scaleX?: number, scaleY?: number): DOMMatrix;
  skewX(sx?: number): DOMMatrix;
  skewY(sy?: number): DOMMatrix;
  toFloat32Array(): Float32Array;
  toFloat64Array(): Float64Array;
  toJSON(): Object;
  transformPoint(point?: DOMPointInit): DOMPoint;
  translate(tx?: number, ty?: number, tz?: number): DOMMatrix;
  toString(): string;
}

declare class DOMPoint extends DOMPointReadOnly {
  w: number;
  x: number;
  y: number;
  z: number;

  static fromPoint(other?: DOMPointInit): DOMPoint;

  constructor(x?: number, y?: number, z?: number, w?: number): void;
}

declare class DOMPointReadOnly {
  +w: number;
  +x: number;
  +y: number;
  +z: number;

  static fromPoint(other?: DOMPointInit): DOMPointReadOnly;

  constructor(x?: number, y?: number, z?: number, w?: number): void;
  matrixTransform(matrix?: DOMMatrixInit): DOMPoint;
  toJSON(): Object;
}

declare class DOMQuad {
  +p1: DOMPoint;
  +p2: DOMPoint;
  +p3: DOMPoint;
  +p4: DOMPoint;

  static fromQuad(other?: DOMQuadInit): DOMQuad;
  static fromRect(other?: DOMRectInit): DOMQuad;

  constructor(
    p1?: DOMPointInit,
    p2?: DOMPointInit,
    p3?: DOMPointInit,
    p4?: DOMPointInit
  ): void;
  getBounds(): DOMRect;
  toJSON(): Object;
}

declare class DOMRect extends DOMRectReadOnly {
  height: number;
  width: number;
  x: number;
  y: number;

  constructor(x?: number, y?: number, width?: number, height?: number): void;

  static fromRect(other?: DOMRectInit): DOMRect;
}

declare class DOMRectList {
  +length: number;

  @@iterator(): Iterator<DOMRect>;

  item(index: number): DOMRect;
  [index: number]: DOMRect;
}

declare class DOMRectReadOnly {
  +bottom: number;
  +height: number;
  +left: number;
  +right: number;
  +top: number;
  +width: number;
  +x: number;
  +y: number;

  constructor(x?: number, y?: number, width?: number, height?: number): void;

  static fromRect(other?: DOMRectInit): DOMRectReadOnly;
  toJSON(): Object;
}
