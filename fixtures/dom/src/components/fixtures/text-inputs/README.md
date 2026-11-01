# Text Inputs

There are a couple of important concepts to be aware of when working on text
inputs in React.

## `defaultValue` vs `value`

An input's value is drawn from two properties: `defaultValue` and `value`.

The `defaultValue` property directly maps to the value _attribute_, for example:

```javascript
var input = document.createElement('input')
input.defaultValue = 'hello'

console.log(input.getAttribute('value')) // => "hello"
```

The `value` property manipulates the _working value_ for the input. This property
changes whenever the user interacts with an input, or it is modified with JavaScript:

```javascript
var input = document.createElement('input')
input.defaultValue = 'hello'
input.value = 'goodbye'

console.log(input.getAttribute('value')) // => "hello"
console.log(input.value) // => "goodbye"
```

## value detachment

Until `value` is manipulated by a user or JavaScript, manipulating `defaultValue`
will also modify the `value` property:

```javascript
var input = document.createElement('input')
// This will turn into 3
input.defaultValue = 3
// This will turn into 5
input.defaultValue = 5
// This will turn into 7
input.value = 7
// This will do nothing
input.defaultValue = 1
```

**React detaches all inputs**. This prevents `value` from accidentally updating if
`defaultValue` changes.

## Form reset events

React does not support `form.reset()` for controlled inputs. This is a feature,
not a bug. `form.reset()` works by reverting an input's `value` _property_ to
that of the current `defaultValue`. Since React assigns the value `attribute`
every time a controlled input's value changes, controlled inputs will never
"revert" back to their original display value.

## Number inputs

Chrome (55) and Safari (10) attempt to "correct" the value of number inputs any
time the value property or attribute are changed. This leads to some edge documented
here:

https://github.com/react/react/pull/7359#issuecomment-256499693
