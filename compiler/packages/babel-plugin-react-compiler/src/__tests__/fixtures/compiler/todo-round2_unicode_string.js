// Round 2 HIR: VALUE_DIFF/UNICODE (1 file)
// Latin Extended-A characters: TS renders literal, Rust escapes as \uXXXX
test('Story permalink vanity slug mobile user heartbeat test', async () => {
  await device.navigate(
    '/user123/posts/ju\xc5\xbc-za-chwil\xc4\x99-wleci-suszarnia-je\xc5\x9bli-komu\xc5\x9b-brakuje-walentynkowych-mi\xc5\x82osnych-unies/744545433701765/',
    {}
  );
});
