function Component({name}: {name: string}) {
  try {
    const url = new URL(name);
    return (
      <div>
        {url.search}
        {url.hash}
      </div>
    );
  } catch {
    return null;
  }
}
