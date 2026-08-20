import {StaticText1, Stringify, Text} from 'shared-runtime';

function Component(props) {
  const {buttons} = props;
  const [primaryButton, ...nonPrimaryButtons] = buttons;

  const renderedNonPrimaryButtons = nonPrimaryButtons.map((buttonProps, i) => (
    <Stringify
      {...buttonProps}
      key={`button-${i}`}
      style={
        i % 2 === 0 ? styles.leftSecondaryButton : styles.rightSecondaryButton
      }
    />
  ));

  return <StaticText1>{renderedNonPrimaryButtons}</StaticText1>;
}

const styles = {
  leftSecondaryButton: {left: true},
  rightSecondaryButton: {right: true},
};

export const FIXTURE_ENTRYPOINT = {
  fn: Component,
  params: [
    {
      buttons: [
        {},
        {type: 'submit', children: ['Submit!']},
        {type: 'button', children: ['Reset']},
      ],
    },
  ],
};
