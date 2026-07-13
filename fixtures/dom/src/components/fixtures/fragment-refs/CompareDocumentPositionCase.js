import TestCase from '../../TestCase';
import Fixture from '../../Fixture';
import CompareDocumentPositionFragmentContainer from './CompareDocumentPositionFragmentContainer';

const React = window.React;

export default function CompareDocumentPositionCase() {
  return (
    <TestCase title="compareDocumentPosition">
      <TestCase.Steps>
        <li>Click the "Compare All Positions" button</li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        The compareDocumentPosition method compares the position of the fragment
        relative to other elements in the DOM. The "Before Element" should be
        PRECEDING the fragment, and the "After Element" should be FOLLOWING.
        Elements inside the fragment should be CONTAINED_BY.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <CompareDocumentPositionFragmentContainer>
            <div
              style={{
                padding: '10px',
                backgroundColor: 'lightblue',
                borderRadius: '4px',
                marginBottom: '8px',
              }}>
              First child element
            </div>
            <div
              style={{
                padding: '10px',
                backgroundColor: 'lightgreen',
                borderRadius: '4px',
                marginBottom: '8px',
              }}>
              Second child element
            </div>
            <div
              style={{
                padding: '10px',
                backgroundColor: 'lightpink',
                borderRadius: '4px',
              }}>
              Third child element
            </div>
          </CompareDocumentPositionFragmentContainer>
        </Fixture.Controls>
      </Fixture>
    </TestCase>
  );
}
