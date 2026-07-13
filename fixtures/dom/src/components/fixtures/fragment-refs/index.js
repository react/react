import FixtureSet from '../../FixtureSet';
import EventListenerCase from './EventListenerCase';
import EventDispatchCase from './EventDispatchCase';
import IntersectionObserverCase from './IntersectionObserverCase';
import ResizeObserverCase from './ResizeObserverCase';
import FocusCase from './FocusCase';
import GetClientRectsCase from './GetClientRectsCase';
import CompareDocumentPositionCase from './CompareDocumentPositionCase';
import ScrollIntoViewCase from './ScrollIntoViewCase';
import TextNodesCase from './TextNodesCase';

const React = window.React;

export default function FragmentRefsPage() {
  return (
    <FixtureSet title="Fragment Refs">
      <EventListenerCase />
      <EventDispatchCase />
      <IntersectionObserverCase />
      <ResizeObserverCase />
      <FocusCase />
      <GetClientRectsCase />
      <CompareDocumentPositionCase />
      <ScrollIntoViewCase />
      <TextNodesCase />
    </FixtureSet>
  );
}
