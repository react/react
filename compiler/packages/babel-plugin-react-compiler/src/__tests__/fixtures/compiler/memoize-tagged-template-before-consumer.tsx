// @compilationMode:"all" @panicThreshold:"none"
export function Component({tag, consume}) {
  return consume(tag`value`);
}
