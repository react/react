// @enableJsxOutlining
function Component() {
  const [isSubmitting] = useState(false);

  return ssoProviders.map(provider => {
    return (
      <div key={provider.providerId}>
        <Switch
          disabled={isSubmitting}
          aria-label={`Toggle ${provider.displayName}`}
        />
      </div>
    );
  });
}
