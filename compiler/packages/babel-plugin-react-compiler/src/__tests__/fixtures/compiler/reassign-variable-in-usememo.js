// @flow
export hook useItemLanguage(items) {
  return useMemo(() => {
    let language: ?string = null;
    items.forEach(item => {
      if (item.language != null) {
        language = item.language;
      }
    });
    return language;
  }, [items]);
}
