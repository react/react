const useCases = ['Going to the store', 'Picking up the kids', 'Watching TV'];

const thisIsSafeBut = {
  useCases: ['but this is not'],
};

export default function MyApp() {
  return (
    <>
      {useCases.map(useCase => (
        <div key={useCase}>{useCase}</div>
      ))}

      {thisIsSafeBut.useCases.map(useCase => (
        <div key={useCase}>{useCase}</div>
      ))}
    </>
  );
}
