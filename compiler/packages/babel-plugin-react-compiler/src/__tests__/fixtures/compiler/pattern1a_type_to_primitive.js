// Pattern 1a: shapeId null→generated + return Type→Primitive
// Arrow function with forEach callback
// Divergence: TS has shapeId:null, return:Type(22); Rust has shapeId:"<generated_0>", return:Primitive

const getItemKeyMap = (): Map<string, string> => {
  const itemKeys = [];
  itemKeys.forEach((itemKey: string) => {});
};
