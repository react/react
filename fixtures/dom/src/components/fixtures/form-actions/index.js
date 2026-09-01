const React = window.React;

const {useState} = React;

async function defer(timeoutMS) {
  return new Promise(resolve => {
    setTimeout(resolve, timeoutMS);
  });
}

export default function FormActions() {
  const [textValue, setTextValue] = useState('0');
  const [radioValue, setRadioValue] = useState('two');
  const [checkboxValue, setCheckboxValue] = useState([false, true, true]);
  const [selectValue, setSelectValue] = useState('three');

  return (
    <form
      action={async () => {
        await defer(500);
      }}
      onReset={() => {
        setTextValue('0');
        setRadioValue('two');
        setCheckboxValue([false, true, true]);
        setSelectValue('three');
      }}>
      <div style={{display: 'flex'}}>
        <fieldset style={{flexBasis: 0}}>
          <legend>type="text"</legend>
          <input
            type="text"
            name="text"
            value={textValue}
            onChange={event => setTextValue(event.currentTarget.value)}
          />
        </fieldset>
        <fieldset style={{flexBasis: 0}}>
          <legend>type="radio"</legend>
          <input
            type="radio"
            name="radio"
            value="one"
            checked={radioValue === 'one'}
            onChange={() => setRadioValue('one')}
          />
          <input
            type="radio"
            name="radio"
            value="two"
            checked={radioValue === 'two'}
            onChange={() => setRadioValue('two')}
          />
          <input
            type="radio"
            name="radio"
            value="three"
            checked={radioValue === 'three'}
            onChange={() => setRadioValue('three')}
          />
        </fieldset>
        <fieldset style={{flexBasis: 0}}>
          <legend>type="checkbox"</legend>
          <input
            type="checkbox"
            name="checkbox"
            value="one"
            checked={checkboxValue[0]}
            onChange={event => {
              const checked = event.currentTarget.checked;
              setCheckboxValue(pending => [checked, pending[1], pending[2]]);
            }}
          />
          <input
            type="checkbox"
            name="checkbox"
            value="two"
            checked={checkboxValue[1]}
            onChange={event => {
              const checked = event.currentTarget.checked;
              setCheckboxValue(pending => [pending[0], checked, pending[2]]);
            }}
          />
          <input
            type="checkbox"
            name="checkbox"
            value="three"
            checked={checkboxValue[2]}
            onChange={event => {
              const checked = event.currentTarget.checked;
              setCheckboxValue(pending => [pending[0], pending[1], checked]);
            }}
          />
        </fieldset>
        <fieldset style={{flexBasis: 0}}>
          <legend>select</legend>
          <select
            name="select"
            value={selectValue}
            onChange={event => setSelectValue(event.currentTarget.value)}>
            <option value="one">one</option>
            <option value="two">two</option>
            <option value="three">three</option>
          </select>
        </fieldset>
      </div>
      <div>
        <input type="reset" />
        <input type="submit" />
      </div>
    </form>
  );
}
