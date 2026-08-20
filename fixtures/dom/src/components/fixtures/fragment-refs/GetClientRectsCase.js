import TestCase from '../../TestCase';
import Fixture from '../../Fixture';
import PrintRectsFragmentContainer from './PrintRectsFragmentContainer';

const React = window.React;

export default function GetClientRectsCase() {
  return (
    <TestCase title="getClientRects">
      <TestCase.Steps>
        <li>
          Click the "Print Rects" button to get the client rects of the
          elements.
        </li>
      </TestCase.Steps>
      <TestCase.ExpectedResult>
        Calling getClientRects on the fragment instance will return a list of a
        DOMRectList for each child node.
      </TestCase.ExpectedResult>
      <Fixture>
        <Fixture.Controls>
          <PrintRectsFragmentContainer>
            <span
              style={{
                width: '300px',
                height: '250px',
                backgroundColor: 'lightblue',
                fontSize: 20,
                border: '1px solid black',
                marginBottom: '10px',
              }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </span>
            <div
              style={{
                width: '150px',
                height: '100px',
                backgroundColor: 'lightgreen',
                border: '1px solid black',
              }}></div>
            <div
              style={{
                width: '500px',
                height: '50px',
                backgroundColor: 'lightpink',
                border: '1px solid black',
              }}></div>
          </PrintRectsFragmentContainer>
        </Fixture.Controls>
      </Fixture>
    </TestCase>
  );
}
