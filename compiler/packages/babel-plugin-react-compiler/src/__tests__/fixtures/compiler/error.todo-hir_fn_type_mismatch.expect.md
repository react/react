
## Input

```javascript
// HIR Pattern: FN_TYPE_MISMATCH (10 files, 3%)
// TS classifies as fn_type: Other, Rust classifies as fn_type: Component

/**
 * @flow strict-local
 */
export default component EmbedRich() {
  if (media) {
    if (post.videoUrl != null && post.videoUrl !== '') {
      renderAboveImage('EmbedVideo', <EmbedVideo post={post} />);
    }
  }
  return;
}

```


## Error

```
Missing semicolon. (7:24)
```
          
      