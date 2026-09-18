// Ensure HTML entity references in JSX text (e.g. &#32;) are preserved after
// compilation and not stripped as whitespace-only nodes.
function MyApp() {
  return (
    <div>
      &#32;
      <span>hello world</span>
    </div>
  );
}
