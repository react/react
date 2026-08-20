## `about` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `about=(string)`| (changed)| `"a string"` |
| `about=(empty string)`| (changed)| `<empty string>` |
| `about=(array with string)`| (changed)| `"string"` |
| `about=(empty array)`| (changed)| `<empty string>` |
| `about=(object)`| (changed)| `"result of toString()"` |
| `about=(numeric string)`| (changed)| `"42"` |
| `about=(-1)`| (changed)| `"-1"` |
| `about=(0)`| (changed)| `"0"` |
| `about=(integer)`| (changed)| `"1"` |
| `about=(NaN)`| (changed, warning)| `"NaN"` |
| `about=(float)`| (changed)| `"99.99"` |
| `about=(true)`| (initial, warning)| `<null>` |
| `about=(false)`| (initial, warning)| `<null>` |
| `about=(string 'true')`| (changed)| `"true"` |
| `about=(string 'false')`| (changed)| `"false"` |
| `about=(string 'on')`| (changed)| `"on"` |
| `about=(string 'off')`| (changed)| `"off"` |
| `about=(symbol)`| (initial, warning)| `<null>` |
| `about=(function)`| (initial, warning)| `<null>` |
| `about=(null)`| (initial)| `<null>` |
| `about=(undefined)`| (initial)| `<null>` |

## `aBoUt` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `aBoUt=(string)`| (changed, warning)| `"a string"` |
| `aBoUt=(empty string)`| (changed, warning)| `<empty string>` |
| `aBoUt=(array with string)`| (changed, warning)| `"string"` |
| `aBoUt=(empty array)`| (changed, warning)| `<empty string>` |
| `aBoUt=(object)`| (changed, warning)| `"result of toString()"` |
| `aBoUt=(numeric string)`| (changed, warning)| `"42"` |
| `aBoUt=(-1)`| (changed, warning)| `"-1"` |
| `aBoUt=(0)`| (changed, warning)| `"0"` |
| `aBoUt=(integer)`| (changed, warning)| `"1"` |
| `aBoUt=(NaN)`| (changed, warning)| `"NaN"` |
| `aBoUt=(float)`| (changed, warning)| `"99.99"` |
| `aBoUt=(true)`| (initial, warning)| `<null>` |
| `aBoUt=(false)`| (initial, warning)| `<null>` |
| `aBoUt=(string 'true')`| (changed, warning)| `"true"` |
| `aBoUt=(string 'false')`| (changed, warning)| `"false"` |
| `aBoUt=(string 'on')`| (changed, warning)| `"on"` |
| `aBoUt=(string 'off')`| (changed, warning)| `"off"` |
| `aBoUt=(symbol)`| (initial, warning)| `<null>` |
| `aBoUt=(function)`| (initial, warning)| `<null>` |
| `aBoUt=(null)`| (initial, warning)| `<null>` |
| `aBoUt=(undefined)`| (initial, warning)| `<null>` |

## `accent-Height` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `accent-Height=(string)`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(empty string)`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(array with string)`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(empty array)`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(object)`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(numeric string)`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(-1)`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(0)`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(integer)`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(NaN)`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(float)`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(true)`| (initial, warning)| `<null>` |
| `accent-Height=(false)`| (initial, warning)| `<null>` |
| `accent-Height=(string 'true')`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(string 'false')`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(string 'on')`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(string 'off')`| (initial, warning, ssr mismatch)| `<null>` |
| `accent-Height=(symbol)`| (initial, warning)| `<null>` |
| `accent-Height=(function)`| (initial, warning)| `<null>` |
| `accent-Height=(null)`| (initial, warning)| `<null>` |
| `accent-Height=(undefined)`| (initial, warning)| `<null>` |

## `accent-height` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `accent-height=(string)`| (changed, warning)| `"a string"` |
| `accent-height=(empty string)`| (changed, warning)| `<empty string>` |
| `accent-height=(array with string)`| (changed, warning)| `"string"` |
| `accent-height=(empty array)`| (changed, warning)| `<empty string>` |
| `accent-height=(object)`| (changed, warning)| `"result of toString()"` |
| `accent-height=(numeric string)`| (changed, warning)| `"42"` |
| `accent-height=(-1)`| (changed, warning)| `"-1"` |
| `accent-height=(0)`| (changed, warning)| `"0"` |
| `accent-height=(integer)`| (changed, warning)| `"1"` |
| `accent-height=(NaN)`| (changed, warning)| `"NaN"` |
| `accent-height=(float)`| (changed, warning)| `"99.99"` |
| `accent-height=(true)`| (initial, warning)| `<null>` |
| `accent-height=(false)`| (initial, warning)| `<null>` |
| `accent-height=(string 'true')`| (changed, warning)| `"true"` |
| `accent-height=(string 'false')`| (changed, warning)| `"false"` |
| `accent-height=(string 'on')`| (changed, warning)| `"on"` |
| `accent-height=(string 'off')`| (changed, warning)| `"off"` |
| `accent-height=(symbol)`| (initial, warning)| `<null>` |
| `accent-height=(function)`| (initial, warning)| `<null>` |
| `accent-height=(null)`| (initial, warning)| `<null>` |
| `accent-height=(undefined)`| (initial, warning)| `<null>` |

## `accentHeight` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `accentHeight=(string)`| (changed)| `"a string"` |
| `accentHeight=(empty string)`| (changed)| `<empty string>` |
| `accentHeight=(array with string)`| (changed)| `"string"` |
| `accentHeight=(empty array)`| (changed)| `<empty string>` |
| `accentHeight=(object)`| (changed)| `"result of toString()"` |
| `accentHeight=(numeric string)`| (changed)| `"42"` |
| `accentHeight=(-1)`| (changed)| `"-1"` |
| `accentHeight=(0)`| (changed)| `"0"` |
| `accentHeight=(integer)`| (changed)| `"1"` |
| `accentHeight=(NaN)`| (changed, warning)| `"NaN"` |
| `accentHeight=(float)`| (changed)| `"99.99"` |
| `accentHeight=(true)`| (initial, warning)| `<null>` |
| `accentHeight=(false)`| (initial, warning)| `<null>` |
| `accentHeight=(string 'true')`| (changed)| `"true"` |
| `accentHeight=(string 'false')`| (changed)| `"false"` |
| `accentHeight=(string 'on')`| (changed)| `"on"` |
| `accentHeight=(string 'off')`| (changed)| `"off"` |
| `accentHeight=(symbol)`| (initial, warning)| `<null>` |
| `accentHeight=(function)`| (initial, warning)| `<null>` |
| `accentHeight=(null)`| (initial)| `<null>` |
| `accentHeight=(undefined)`| (initial)| `<null>` |

## `accept` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `accept=(string)`| (changed)| `"a string"` |
| `accept=(empty string)`| (initial)| `<empty string>` |
| `accept=(array with string)`| (changed)| `"string"` |
| `accept=(empty array)`| (initial)| `<empty string>` |
| `accept=(object)`| (changed)| `"result of toString()"` |
| `accept=(numeric string)`| (changed)| `"42"` |
| `accept=(-1)`| (changed)| `"-1"` |
| `accept=(0)`| (changed)| `"0"` |
| `accept=(integer)`| (changed)| `"1"` |
| `accept=(NaN)`| (changed, warning)| `"NaN"` |
| `accept=(float)`| (changed)| `"99.99"` |
| `accept=(true)`| (initial, warning)| `<empty string>` |
| `accept=(false)`| (initial, warning)| `<empty string>` |
| `accept=(string 'true')`| (changed)| `"true"` |
| `accept=(string 'false')`| (changed)| `"false"` |
| `accept=(string 'on')`| (changed)| `"on"` |
| `accept=(string 'off')`| (changed)| `"off"` |
| `accept=(symbol)`| (initial, warning)| `<empty string>` |
| `accept=(function)`| (initial, warning)| `<empty string>` |
| `accept=(null)`| (initial)| `<empty string>` |
| `accept=(undefined)`| (initial)| `<empty string>` |

## `accept-charset` (on `<form>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `accept-charset=(string)`| (changed, warning)| `"a string"` |
| `accept-charset=(empty string)`| (initial, warning)| `<empty string>` |
| `accept-charset=(array with string)`| (changed, warning)| `"string"` |
| `accept-charset=(empty array)`| (initial, warning)| `<empty string>` |
| `accept-charset=(object)`| (changed, warning)| `"result of toString()"` |
| `accept-charset=(numeric string)`| (changed, warning)| `"42"` |
| `accept-charset=(-1)`| (changed, warning)| `"-1"` |
| `accept-charset=(0)`| (changed, warning)| `"0"` |
| `accept-charset=(integer)`| (changed, warning)| `"1"` |
| `accept-charset=(NaN)`| (changed, warning)| `"NaN"` |
| `accept-charset=(float)`| (changed, warning)| `"99.99"` |
| `accept-charset=(true)`| (initial, warning)| `<empty string>` |
| `accept-charset=(false)`| (initial, warning)| `<empty string>` |
| `accept-charset=(string 'true')`| (changed, warning)| `"true"` |
| `accept-charset=(string 'false')`| (changed, warning)| `"false"` |
| `accept-charset=(string 'on')`| (changed, warning)| `"on"` |
| `accept-charset=(string 'off')`| (changed, warning)| `"off"` |
| `accept-charset=(symbol)`| (initial, warning)| `<empty string>` |
| `accept-charset=(function)`| (initial, warning)| `<empty string>` |
| `accept-charset=(null)`| (initial, warning)| `<empty string>` |
| `accept-charset=(undefined)`| (initial, warning)| `<empty string>` |

## `accept-Charset` (on `<form>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `accept-Charset=(string)`| (changed, warning)| `"a string"` |
| `accept-Charset=(empty string)`| (initial, warning)| `<empty string>` |
| `accept-Charset=(array with string)`| (changed, warning)| `"string"` |
| `accept-Charset=(empty array)`| (initial, warning)| `<empty string>` |
| `accept-Charset=(object)`| (changed, warning)| `"result of toString()"` |
| `accept-Charset=(numeric string)`| (changed, warning)| `"42"` |
| `accept-Charset=(-1)`| (changed, warning)| `"-1"` |
| `accept-Charset=(0)`| (changed, warning)| `"0"` |
| `accept-Charset=(integer)`| (changed, warning)| `"1"` |
| `accept-Charset=(NaN)`| (changed, warning)| `"NaN"` |
| `accept-Charset=(float)`| (changed, warning)| `"99.99"` |
| `accept-Charset=(true)`| (initial, warning)| `<empty string>` |
| `accept-Charset=(false)`| (initial, warning)| `<empty string>` |
| `accept-Charset=(string 'true')`| (changed, warning)| `"true"` |
| `accept-Charset=(string 'false')`| (changed, warning)| `"false"` |
| `accept-Charset=(string 'on')`| (changed, warning)| `"on"` |
| `accept-Charset=(string 'off')`| (changed, warning)| `"off"` |
| `accept-Charset=(symbol)`| (initial, warning)| `<empty string>` |
| `accept-Charset=(function)`| (initial, warning)| `<empty string>` |
| `accept-Charset=(null)`| (initial, warning)| `<empty string>` |
| `accept-Charset=(undefined)`| (initial, warning)| `<empty string>` |

## `acceptCharset` (on `<form>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `acceptCharset=(string)`| (changed)| `"a string"` |
| `acceptCharset=(empty string)`| (initial)| `<empty string>` |
| `acceptCharset=(array with string)`| (changed)| `"string"` |
| `acceptCharset=(empty array)`| (initial)| `<empty string>` |
| `acceptCharset=(object)`| (changed)| `"result of toString()"` |
| `acceptCharset=(numeric string)`| (changed)| `"42"` |
| `acceptCharset=(-1)`| (changed)| `"-1"` |
| `acceptCharset=(0)`| (changed)| `"0"` |
| `acceptCharset=(integer)`| (changed)| `"1"` |
| `acceptCharset=(NaN)`| (changed, warning)| `"NaN"` |
| `acceptCharset=(float)`| (changed)| `"99.99"` |
| `acceptCharset=(true)`| (initial, warning)| `<empty string>` |
| `acceptCharset=(false)`| (initial, warning)| `<empty string>` |
| `acceptCharset=(string 'true')`| (changed)| `"true"` |
| `acceptCharset=(string 'false')`| (changed)| `"false"` |
| `acceptCharset=(string 'on')`| (changed)| `"on"` |
| `acceptCharset=(string 'off')`| (changed)| `"off"` |
| `acceptCharset=(symbol)`| (initial, warning)| `<empty string>` |
| `acceptCharset=(function)`| (initial, warning)| `<empty string>` |
| `acceptCharset=(null)`| (initial)| `<empty string>` |
| `acceptCharset=(undefined)`| (initial)| `<empty string>` |

## `accessKey` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `accessKey=(string)`| (changed)| `"a string"` |
| `accessKey=(empty string)`| (initial)| `<empty string>` |
| `accessKey=(array with string)`| (changed)| `"string"` |
| `accessKey=(empty array)`| (initial)| `<empty string>` |
| `accessKey=(object)`| (changed)| `"result of toString()"` |
| `accessKey=(numeric string)`| (changed)| `"42"` |
| `accessKey=(-1)`| (changed)| `"-1"` |
| `accessKey=(0)`| (changed)| `"0"` |
| `accessKey=(integer)`| (changed)| `"1"` |
| `accessKey=(NaN)`| (changed, warning)| `"NaN"` |
| `accessKey=(float)`| (changed)| `"99.99"` |
| `accessKey=(true)`| (initial, warning)| `<empty string>` |
| `accessKey=(false)`| (initial, warning)| `<empty string>` |
| `accessKey=(string 'true')`| (changed)| `"true"` |
| `accessKey=(string 'false')`| (changed)| `"false"` |
| `accessKey=(string 'on')`| (changed)| `"on"` |
| `accessKey=(string 'off')`| (changed)| `"off"` |
| `accessKey=(symbol)`| (initial, warning)| `<empty string>` |
| `accessKey=(function)`| (initial, warning)| `<empty string>` |
| `accessKey=(null)`| (initial)| `<empty string>` |
| `accessKey=(undefined)`| (initial)| `<empty string>` |

## `accumulate` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `accumulate=(string)`| (changed)| `"a string"` |
| `accumulate=(empty string)`| (changed)| `<empty string>` |
| `accumulate=(array with string)`| (changed)| `"string"` |
| `accumulate=(empty array)`| (changed)| `<empty string>` |
| `accumulate=(object)`| (changed)| `"result of toString()"` |
| `accumulate=(numeric string)`| (changed)| `"42"` |
| `accumulate=(-1)`| (changed)| `"-1"` |
| `accumulate=(0)`| (changed)| `"0"` |
| `accumulate=(integer)`| (changed)| `"1"` |
| `accumulate=(NaN)`| (changed, warning)| `"NaN"` |
| `accumulate=(float)`| (changed)| `"99.99"` |
| `accumulate=(true)`| (initial, warning)| `<null>` |
| `accumulate=(false)`| (initial, warning)| `<null>` |
| `accumulate=(string 'true')`| (changed)| `"true"` |
| `accumulate=(string 'false')`| (changed)| `"false"` |
| `accumulate=(string 'on')`| (changed)| `"on"` |
| `accumulate=(string 'off')`| (changed)| `"off"` |
| `accumulate=(symbol)`| (initial, warning)| `<null>` |
| `accumulate=(function)`| (initial, warning)| `<null>` |
| `accumulate=(null)`| (initial)| `<null>` |
| `accumulate=(undefined)`| (initial)| `<null>` |

## `action` (on `<form>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `action=(string)`| (changed)| `"https://reactjs.com/"` |
| `action=(empty string)`| (initial)| `"http://localhost:3000/"` |
| `action=(array with string)`| (changed)| `"https://reactjs.com/"` |
| `action=(empty array)`| (initial)| `"http://localhost:3000/"` |
| `action=(object)`| (changed)| `"http://localhost:3000/result%20of%20toString()"` |
| `action=(numeric string)`| (changed)| `"http://localhost:3000/42"` |
| `action=(-1)`| (changed)| `"http://localhost:3000/-1"` |
| `action=(0)`| (changed)| `"http://localhost:3000/0"` |
| `action=(integer)`| (changed)| `"http://localhost:3000/1"` |
| `action=(NaN)`| (changed, warning)| `"http://localhost:3000/NaN"` |
| `action=(float)`| (changed)| `"http://localhost:3000/99.99"` |
| `action=(true)`| (initial, warning)| `"http://localhost:3000/"` |
| `action=(false)`| (initial, warning)| `"http://localhost:3000/"` |
| `action=(string 'true')`| (changed)| `"http://localhost:3000/true"` |
| `action=(string 'false')`| (changed)| `"http://localhost:3000/false"` |
| `action=(string 'on')`| (changed)| `"http://localhost:3000/on"` |
| `action=(string 'off')`| (changed)| `"http://localhost:3000/off"` |
| `action=(symbol)`| (initial, warning)| `"http://localhost:3000/"` |
| `action=(function)`| (changed, ssr error, ssr mismatch)| `"javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"` |
| `action=(null)`| (initial)| `"http://localhost:3000/"` |
| `action=(undefined)`| (initial)| `"http://localhost:3000/"` |

## `additive` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `additive=(string)`| (changed)| `"a string"` |
| `additive=(empty string)`| (changed)| `<empty string>` |
| `additive=(array with string)`| (changed)| `"string"` |
| `additive=(empty array)`| (changed)| `<empty string>` |
| `additive=(object)`| (changed)| `"result of toString()"` |
| `additive=(numeric string)`| (changed)| `"42"` |
| `additive=(-1)`| (changed)| `"-1"` |
| `additive=(0)`| (changed)| `"0"` |
| `additive=(integer)`| (changed)| `"1"` |
| `additive=(NaN)`| (changed, warning)| `"NaN"` |
| `additive=(float)`| (changed)| `"99.99"` |
| `additive=(true)`| (initial, warning)| `<null>` |
| `additive=(false)`| (initial, warning)| `<null>` |
| `additive=(string 'true')`| (changed)| `"true"` |
| `additive=(string 'false')`| (changed)| `"false"` |
| `additive=(string 'on')`| (changed)| `"on"` |
| `additive=(string 'off')`| (changed)| `"off"` |
| `additive=(symbol)`| (initial, warning)| `<null>` |
| `additive=(function)`| (initial, warning)| `<null>` |
| `additive=(null)`| (initial)| `<null>` |
| `additive=(undefined)`| (initial)| `<null>` |

## `alignment-baseline` (on `<textPath>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `alignment-baseline=(string)`| (changed, warning)| `"a string"` |
| `alignment-baseline=(empty string)`| (changed, warning)| `<empty string>` |
| `alignment-baseline=(array with string)`| (changed, warning)| `"string"` |
| `alignment-baseline=(empty array)`| (changed, warning)| `<empty string>` |
| `alignment-baseline=(object)`| (changed, warning)| `"result of toString()"` |
| `alignment-baseline=(numeric string)`| (changed, warning)| `"42"` |
| `alignment-baseline=(-1)`| (changed, warning)| `"-1"` |
| `alignment-baseline=(0)`| (changed, warning)| `"0"` |
| `alignment-baseline=(integer)`| (changed, warning)| `"1"` |
| `alignment-baseline=(NaN)`| (changed, warning)| `"NaN"` |
| `alignment-baseline=(float)`| (changed, warning)| `"99.99"` |
| `alignment-baseline=(true)`| (initial, warning)| `<null>` |
| `alignment-baseline=(false)`| (initial, warning)| `<null>` |
| `alignment-baseline=(string 'true')`| (changed, warning)| `"true"` |
| `alignment-baseline=(string 'false')`| (changed, warning)| `"false"` |
| `alignment-baseline=(string 'on')`| (changed, warning)| `"on"` |
| `alignment-baseline=(string 'off')`| (changed, warning)| `"off"` |
| `alignment-baseline=(symbol)`| (initial, warning)| `<null>` |
| `alignment-baseline=(function)`| (initial, warning)| `<null>` |
| `alignment-baseline=(null)`| (initial, warning)| `<null>` |
| `alignment-baseline=(undefined)`| (initial, warning)| `<null>` |

## `alignmentBaseline` (on `<textPath>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `alignmentBaseline=(string)`| (changed)| `"a string"` |
| `alignmentBaseline=(empty string)`| (changed)| `<empty string>` |
| `alignmentBaseline=(array with string)`| (changed)| `"string"` |
| `alignmentBaseline=(empty array)`| (changed)| `<empty string>` |
| `alignmentBaseline=(object)`| (changed)| `"result of toString()"` |
| `alignmentBaseline=(numeric string)`| (changed)| `"42"` |
| `alignmentBaseline=(-1)`| (changed)| `"-1"` |
| `alignmentBaseline=(0)`| (changed)| `"0"` |
| `alignmentBaseline=(integer)`| (changed)| `"1"` |
| `alignmentBaseline=(NaN)`| (changed, warning)| `"NaN"` |
| `alignmentBaseline=(float)`| (changed)| `"99.99"` |
| `alignmentBaseline=(true)`| (initial, warning)| `<null>` |
| `alignmentBaseline=(false)`| (initial, warning)| `<null>` |
| `alignmentBaseline=(string 'true')`| (changed)| `"true"` |
| `alignmentBaseline=(string 'false')`| (changed)| `"false"` |
| `alignmentBaseline=(string 'on')`| (changed)| `"on"` |
| `alignmentBaseline=(string 'off')`| (changed)| `"off"` |
| `alignmentBaseline=(symbol)`| (initial, warning)| `<null>` |
| `alignmentBaseline=(function)`| (initial, warning)| `<null>` |
| `alignmentBaseline=(null)`| (initial)| `<null>` |
| `alignmentBaseline=(undefined)`| (initial)| `<null>` |

## `allowFullScreen` (on `<iframe>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `allowFullScreen=(string)`| (changed)| `<boolean: true>` |
| `allowFullScreen=(empty string)`| (initial)| `<boolean: false>` |
| `allowFullScreen=(array with string)`| (changed)| `<boolean: true>` |
| `allowFullScreen=(empty array)`| (changed)| `<boolean: true>` |
| `allowFullScreen=(object)`| (changed)| `<boolean: true>` |
| `allowFullScreen=(numeric string)`| (changed)| `<boolean: true>` |
| `allowFullScreen=(-1)`| (changed)| `<boolean: true>` |
| `allowFullScreen=(0)`| (initial)| `<boolean: false>` |
| `allowFullScreen=(integer)`| (changed)| `<boolean: true>` |
| `allowFullScreen=(NaN)`| (initial, warning)| `<boolean: false>` |
| `allowFullScreen=(float)`| (changed)| `<boolean: true>` |
| `allowFullScreen=(true)`| (changed)| `<boolean: true>` |
| `allowFullScreen=(false)`| (initial)| `<boolean: false>` |
| `allowFullScreen=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `allowFullScreen=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `allowFullScreen=(string 'on')`| (changed)| `<boolean: true>` |
| `allowFullScreen=(string 'off')`| (changed)| `<boolean: true>` |
| `allowFullScreen=(symbol)`| (initial, warning)| `<boolean: false>` |
| `allowFullScreen=(function)`| (initial, warning)| `<boolean: false>` |
| `allowFullScreen=(null)`| (initial)| `<boolean: false>` |
| `allowFullScreen=(undefined)`| (initial)| `<boolean: false>` |

## `allowfullscreen` (on `<iframe>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `allowfullscreen=(string)`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(empty string)`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(array with string)`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(empty array)`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(object)`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(numeric string)`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(-1)`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(0)`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(integer)`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(NaN)`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(float)`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(true)`| (initial, warning)| `<boolean: false>` |
| `allowfullscreen=(false)`| (initial, warning)| `<boolean: false>` |
| `allowfullscreen=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(string 'on')`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(string 'off')`| (changed, warning)| `<boolean: true>` |
| `allowfullscreen=(symbol)`| (initial, warning)| `<boolean: false>` |
| `allowfullscreen=(function)`| (initial, warning)| `<boolean: false>` |
| `allowfullscreen=(null)`| (initial, warning)| `<boolean: false>` |
| `allowfullscreen=(undefined)`| (initial, warning)| `<boolean: false>` |

## `allowFullscreen` (on `<iframe>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `allowFullscreen=(string)`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(empty string)`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(array with string)`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(empty array)`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(object)`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(numeric string)`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(-1)`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(0)`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(integer)`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(NaN)`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(float)`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(true)`| (initial, warning)| `<boolean: false>` |
| `allowFullscreen=(false)`| (initial, warning)| `<boolean: false>` |
| `allowFullscreen=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(string 'on')`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(string 'off')`| (changed, warning)| `<boolean: true>` |
| `allowFullscreen=(symbol)`| (initial, warning)| `<boolean: false>` |
| `allowFullscreen=(function)`| (initial, warning)| `<boolean: false>` |
| `allowFullscreen=(null)`| (initial, warning)| `<boolean: false>` |
| `allowFullscreen=(undefined)`| (initial, warning)| `<boolean: false>` |

## `allowReorder` (on `<switch>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `allowReorder=(string)`| (changed, ssr mismatch)| `"a string"` |
| `allowReorder=(empty string)`| (changed, ssr mismatch)| `<empty string>` |
| `allowReorder=(array with string)`| (changed, ssr mismatch)| `"string"` |
| `allowReorder=(empty array)`| (changed, ssr mismatch)| `<empty string>` |
| `allowReorder=(object)`| (changed, ssr mismatch)| `"result of toString()"` |
| `allowReorder=(numeric string)`| (changed, ssr mismatch)| `"42"` |
| `allowReorder=(-1)`| (changed, ssr mismatch)| `"-1"` |
| `allowReorder=(0)`| (changed, ssr mismatch)| `"0"` |
| `allowReorder=(integer)`| (changed, ssr mismatch)| `"1"` |
| `allowReorder=(NaN)`| (changed, warning, ssr mismatch)| `"NaN"` |
| `allowReorder=(float)`| (changed, ssr mismatch)| `"99.99"` |
| `allowReorder=(true)`| (initial, warning)| `<null>` |
| `allowReorder=(false)`| (initial, warning)| `<null>` |
| `allowReorder=(string 'true')`| (changed, ssr mismatch)| `"true"` |
| `allowReorder=(string 'false')`| (changed, ssr mismatch)| `"false"` |
| `allowReorder=(string 'on')`| (changed, ssr mismatch)| `"on"` |
| `allowReorder=(string 'off')`| (changed, ssr mismatch)| `"off"` |
| `allowReorder=(symbol)`| (initial, warning)| `<null>` |
| `allowReorder=(function)`| (initial, warning)| `<null>` |
| `allowReorder=(null)`| (initial)| `<null>` |
| `allowReorder=(undefined)`| (initial)| `<null>` |

## `alphabetic` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `alphabetic=(string)`| (changed)| `"a string"` |
| `alphabetic=(empty string)`| (changed)| `<empty string>` |
| `alphabetic=(array with string)`| (changed)| `"string"` |
| `alphabetic=(empty array)`| (changed)| `<empty string>` |
| `alphabetic=(object)`| (changed)| `"result of toString()"` |
| `alphabetic=(numeric string)`| (changed)| `"42"` |
| `alphabetic=(-1)`| (changed)| `"-1"` |
| `alphabetic=(0)`| (changed)| `"0"` |
| `alphabetic=(integer)`| (changed)| `"1"` |
| `alphabetic=(NaN)`| (changed, warning)| `"NaN"` |
| `alphabetic=(float)`| (changed)| `"99.99"` |
| `alphabetic=(true)`| (initial, warning)| `<null>` |
| `alphabetic=(false)`| (initial, warning)| `<null>` |
| `alphabetic=(string 'true')`| (changed)| `"true"` |
| `alphabetic=(string 'false')`| (changed)| `"false"` |
| `alphabetic=(string 'on')`| (changed)| `"on"` |
| `alphabetic=(string 'off')`| (changed)| `"off"` |
| `alphabetic=(symbol)`| (initial, warning)| `<null>` |
| `alphabetic=(function)`| (initial, warning)| `<null>` |
| `alphabetic=(null)`| (initial)| `<null>` |
| `alphabetic=(undefined)`| (initial)| `<null>` |

## `alt` (on `<img>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `alt=(string)`| (changed)| `"a string"` |
| `alt=(empty string)`| (initial)| `<empty string>` |
| `alt=(array with string)`| (changed)| `"string"` |
| `alt=(empty array)`| (initial)| `<empty string>` |
| `alt=(object)`| (changed)| `"result of toString()"` |
| `alt=(numeric string)`| (changed)| `"42"` |
| `alt=(-1)`| (changed)| `"-1"` |
| `alt=(0)`| (changed)| `"0"` |
| `alt=(integer)`| (changed)| `"1"` |
| `alt=(NaN)`| (changed, warning)| `"NaN"` |
| `alt=(float)`| (changed)| `"99.99"` |
| `alt=(true)`| (initial, warning)| `<empty string>` |
| `alt=(false)`| (initial, warning)| `<empty string>` |
| `alt=(string 'true')`| (changed)| `"true"` |
| `alt=(string 'false')`| (changed)| `"false"` |
| `alt=(string 'on')`| (changed)| `"on"` |
| `alt=(string 'off')`| (changed)| `"off"` |
| `alt=(symbol)`| (initial, warning)| `<empty string>` |
| `alt=(function)`| (initial, warning)| `<empty string>` |
| `alt=(null)`| (initial)| `<empty string>` |
| `alt=(undefined)`| (initial)| `<empty string>` |

## `amplitude` (on `<feFuncA>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `amplitude=(string)`| (initial)| `<number: 1>` |
| `amplitude=(empty string)`| (changed)| `<number: 0>` |
| `amplitude=(array with string)`| (initial)| `<number: 1>` |
| `amplitude=(empty array)`| (changed)| `<number: 0>` |
| `amplitude=(object)`| (initial)| `<number: 1>` |
| `amplitude=(numeric string)`| (changed)| `<number: 42>` |
| `amplitude=(-1)`| (changed)| `<number: -1>` |
| `amplitude=(0)`| (changed)| `<number: 0>` |
| `amplitude=(integer)`| (initial)| `<number: 1>` |
| `amplitude=(NaN)`| (initial, warning)| `<number: 1>` |
| `amplitude=(float)`| (changed)| `<number: 99.98999786376953>` |
| `amplitude=(true)`| (initial, warning)| `<number: 1>` |
| `amplitude=(false)`| (initial, warning)| `<number: 1>` |
| `amplitude=(string 'true')`| (initial)| `<number: 1>` |
| `amplitude=(string 'false')`| (initial)| `<number: 1>` |
| `amplitude=(string 'on')`| (initial)| `<number: 1>` |
| `amplitude=(string 'off')`| (initial)| `<number: 1>` |
| `amplitude=(symbol)`| (initial, warning)| `<number: 1>` |
| `amplitude=(function)`| (initial, warning)| `<number: 1>` |
| `amplitude=(null)`| (initial)| `<number: 1>` |
| `amplitude=(undefined)`| (initial)| `<number: 1>` |

## `arabic-form` (on `<glyph>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `arabic-form=(string)`| (changed, warning)| `"a string"` |
| `arabic-form=(empty string)`| (changed, warning)| `<empty string>` |
| `arabic-form=(array with string)`| (changed, warning)| `"string"` |
| `arabic-form=(empty array)`| (changed, warning)| `<empty string>` |
| `arabic-form=(object)`| (changed, warning)| `"result of toString()"` |
| `arabic-form=(numeric string)`| (changed, warning)| `"42"` |
| `arabic-form=(-1)`| (changed, warning)| `"-1"` |
| `arabic-form=(0)`| (changed, warning)| `"0"` |
| `arabic-form=(integer)`| (changed, warning)| `"1"` |
| `arabic-form=(NaN)`| (changed, warning)| `"NaN"` |
| `arabic-form=(float)`| (changed, warning)| `"99.99"` |
| `arabic-form=(true)`| (initial, warning)| `<null>` |
| `arabic-form=(false)`| (initial, warning)| `<null>` |
| `arabic-form=(string 'true')`| (changed, warning)| `"true"` |
| `arabic-form=(string 'false')`| (changed, warning)| `"false"` |
| `arabic-form=(string 'on')`| (changed, warning)| `"on"` |
| `arabic-form=(string 'off')`| (changed, warning)| `"off"` |
| `arabic-form=(symbol)`| (initial, warning)| `<null>` |
| `arabic-form=(function)`| (initial, warning)| `<null>` |
| `arabic-form=(null)`| (initial, warning)| `<null>` |
| `arabic-form=(undefined)`| (initial, warning)| `<null>` |

## `arabicForm` (on `<glyph>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `arabicForm=(string)`| (changed)| `"a string"` |
| `arabicForm=(empty string)`| (changed)| `<empty string>` |
| `arabicForm=(array with string)`| (changed)| `"string"` |
| `arabicForm=(empty array)`| (changed)| `<empty string>` |
| `arabicForm=(object)`| (changed)| `"result of toString()"` |
| `arabicForm=(numeric string)`| (changed)| `"42"` |
| `arabicForm=(-1)`| (changed)| `"-1"` |
| `arabicForm=(0)`| (changed)| `"0"` |
| `arabicForm=(integer)`| (changed)| `"1"` |
| `arabicForm=(NaN)`| (changed, warning)| `"NaN"` |
| `arabicForm=(float)`| (changed)| `"99.99"` |
| `arabicForm=(true)`| (initial, warning)| `<null>` |
| `arabicForm=(false)`| (initial, warning)| `<null>` |
| `arabicForm=(string 'true')`| (changed)| `"true"` |
| `arabicForm=(string 'false')`| (changed)| `"false"` |
| `arabicForm=(string 'on')`| (changed)| `"on"` |
| `arabicForm=(string 'off')`| (changed)| `"off"` |
| `arabicForm=(symbol)`| (initial, warning)| `<null>` |
| `arabicForm=(function)`| (initial, warning)| `<null>` |
| `arabicForm=(null)`| (initial)| `<null>` |
| `arabicForm=(undefined)`| (initial)| `<null>` |

## `aria` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `aria=(string)`| (changed, warning)| `"a string"` |
| `aria=(empty string)`| (changed, warning)| `<empty string>` |
| `aria=(array with string)`| (changed, warning)| `"string"` |
| `aria=(empty array)`| (changed, warning)| `<empty string>` |
| `aria=(object)`| (changed, warning)| `"result of toString()"` |
| `aria=(numeric string)`| (changed, warning)| `"42"` |
| `aria=(-1)`| (changed, warning)| `"-1"` |
| `aria=(0)`| (changed, warning)| `"0"` |
| `aria=(integer)`| (changed, warning)| `"1"` |
| `aria=(NaN)`| (changed, warning)| `"NaN"` |
| `aria=(float)`| (changed, warning)| `"99.99"` |
| `aria=(true)`| (initial, warning)| `<null>` |
| `aria=(false)`| (initial, warning)| `<null>` |
| `aria=(string 'true')`| (changed, warning)| `"true"` |
| `aria=(string 'false')`| (changed, warning)| `"false"` |
| `aria=(string 'on')`| (changed, warning)| `"on"` |
| `aria=(string 'off')`| (changed, warning)| `"off"` |
| `aria=(symbol)`| (initial, warning)| `<null>` |
| `aria=(function)`| (initial, warning)| `<null>` |
| `aria=(null)`| (initial, warning)| `<null>` |
| `aria=(undefined)`| (initial, warning)| `<null>` |

## `aria-` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `aria-=(string)`| (changed, warning)| `"a string"` |
| `aria-=(empty string)`| (changed, warning)| `<empty string>` |
| `aria-=(array with string)`| (changed, warning)| `"string"` |
| `aria-=(empty array)`| (changed, warning)| `<empty string>` |
| `aria-=(object)`| (changed, warning)| `"result of toString()"` |
| `aria-=(numeric string)`| (changed, warning)| `"42"` |
| `aria-=(-1)`| (changed, warning)| `"-1"` |
| `aria-=(0)`| (changed, warning)| `"0"` |
| `aria-=(integer)`| (changed, warning)| `"1"` |
| `aria-=(NaN)`| (changed, warning)| `"NaN"` |
| `aria-=(float)`| (changed, warning)| `"99.99"` |
| `aria-=(true)`| (changed, warning)| `"true"` |
| `aria-=(false)`| (changed, warning)| `"false"` |
| `aria-=(string 'true')`| (changed, warning)| `"true"` |
| `aria-=(string 'false')`| (changed, warning)| `"false"` |
| `aria-=(string 'on')`| (changed, warning)| `"on"` |
| `aria-=(string 'off')`| (changed, warning)| `"off"` |
| `aria-=(symbol)`| (initial, warning)| `<null>` |
| `aria-=(function)`| (initial, warning)| `<null>` |
| `aria-=(null)`| (initial, warning)| `<null>` |
| `aria-=(undefined)`| (initial, warning)| `<null>` |

## `aria-hidden` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `aria-hidden=(string)`| (changed)| `"a string"` |
| `aria-hidden=(empty string)`| (changed)| `<empty string>` |
| `aria-hidden=(array with string)`| (changed)| `"string"` |
| `aria-hidden=(empty array)`| (changed)| `<empty string>` |
| `aria-hidden=(object)`| (changed)| `"result of toString()"` |
| `aria-hidden=(numeric string)`| (changed)| `"42"` |
| `aria-hidden=(-1)`| (changed)| `"-1"` |
| `aria-hidden=(0)`| (changed)| `"0"` |
| `aria-hidden=(integer)`| (changed)| `"1"` |
| `aria-hidden=(NaN)`| (changed)| `"NaN"` |
| `aria-hidden=(float)`| (changed)| `"99.99"` |
| `aria-hidden=(true)`| (changed)| `"true"` |
| `aria-hidden=(false)`| (changed)| `"false"` |
| `aria-hidden=(string 'true')`| (changed)| `"true"` |
| `aria-hidden=(string 'false')`| (changed)| `"false"` |
| `aria-hidden=(string 'on')`| (changed)| `"on"` |
| `aria-hidden=(string 'off')`| (changed)| `"off"` |
| `aria-hidden=(symbol)`| (initial)| `<null>` |
| `aria-hidden=(function)`| (initial)| `<null>` |
| `aria-hidden=(null)`| (initial)| `<null>` |
| `aria-hidden=(undefined)`| (initial)| `<null>` |

## `aria-invalidattribute` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `aria-invalidattribute=(string)`| (changed, warning)| `"a string"` |
| `aria-invalidattribute=(empty string)`| (changed, warning)| `<empty string>` |
| `aria-invalidattribute=(array with string)`| (changed, warning)| `"string"` |
| `aria-invalidattribute=(empty array)`| (changed, warning)| `<empty string>` |
| `aria-invalidattribute=(object)`| (changed, warning)| `"result of toString()"` |
| `aria-invalidattribute=(numeric string)`| (changed, warning)| `"42"` |
| `aria-invalidattribute=(-1)`| (changed, warning)| `"-1"` |
| `aria-invalidattribute=(0)`| (changed, warning)| `"0"` |
| `aria-invalidattribute=(integer)`| (changed, warning)| `"1"` |
| `aria-invalidattribute=(NaN)`| (changed, warning)| `"NaN"` |
| `aria-invalidattribute=(float)`| (changed, warning)| `"99.99"` |
| `aria-invalidattribute=(true)`| (changed, warning)| `"true"` |
| `aria-invalidattribute=(false)`| (changed, warning)| `"false"` |
| `aria-invalidattribute=(string 'true')`| (changed, warning)| `"true"` |
| `aria-invalidattribute=(string 'false')`| (changed, warning)| `"false"` |
| `aria-invalidattribute=(string 'on')`| (changed, warning)| `"on"` |
| `aria-invalidattribute=(string 'off')`| (changed, warning)| `"off"` |
| `aria-invalidattribute=(symbol)`| (initial, warning)| `<null>` |
| `aria-invalidattribute=(function)`| (initial, warning)| `<null>` |
| `aria-invalidattribute=(null)`| (initial, warning)| `<null>` |
| `aria-invalidattribute=(undefined)`| (initial, warning)| `<null>` |

## `as` (on `<link>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `as=(string)`| (initial)| `<empty string>` |
| `as=(empty string)`| (initial)| `<empty string>` |
| `as=(array with string)`| (initial)| `<empty string>` |
| `as=(empty array)`| (initial)| `<empty string>` |
| `as=(object)`| (initial)| `<empty string>` |
| `as=(numeric string)`| (initial)| `<empty string>` |
| `as=(-1)`| (initial)| `<empty string>` |
| `as=(0)`| (initial)| `<empty string>` |
| `as=(integer)`| (initial)| `<empty string>` |
| `as=(NaN)`| (initial, warning)| `<empty string>` |
| `as=(float)`| (initial)| `<empty string>` |
| `as=(true)`| (initial, warning)| `<empty string>` |
| `as=(false)`| (initial, warning)| `<empty string>` |
| `as=(string 'true')`| (initial)| `<empty string>` |
| `as=(string 'false')`| (initial)| `<empty string>` |
| `as=(string 'on')`| (initial)| `<empty string>` |
| `as=(string 'off')`| (initial)| `<empty string>` |
| `as=(symbol)`| (initial, warning)| `<empty string>` |
| `as=(function)`| (initial, warning)| `<empty string>` |
| `as=(null)`| (initial)| `<empty string>` |
| `as=(undefined)`| (initial)| `<empty string>` |

## `ascent` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `ascent=(string)`| (changed)| `"a string"` |
| `ascent=(empty string)`| (changed)| `<empty string>` |
| `ascent=(array with string)`| (changed)| `"string"` |
| `ascent=(empty array)`| (changed)| `<empty string>` |
| `ascent=(object)`| (changed)| `"result of toString()"` |
| `ascent=(numeric string)`| (changed)| `"42"` |
| `ascent=(-1)`| (changed)| `"-1"` |
| `ascent=(0)`| (changed)| `"0"` |
| `ascent=(integer)`| (changed)| `"1"` |
| `ascent=(NaN)`| (changed, warning)| `"NaN"` |
| `ascent=(float)`| (changed)| `"99.99"` |
| `ascent=(true)`| (initial, warning)| `<null>` |
| `ascent=(false)`| (initial, warning)| `<null>` |
| `ascent=(string 'true')`| (changed)| `"true"` |
| `ascent=(string 'false')`| (changed)| `"false"` |
| `ascent=(string 'on')`| (changed)| `"on"` |
| `ascent=(string 'off')`| (changed)| `"off"` |
| `ascent=(symbol)`| (initial, warning)| `<null>` |
| `ascent=(function)`| (initial, warning)| `<null>` |
| `ascent=(null)`| (initial)| `<null>` |
| `ascent=(undefined)`| (initial)| `<null>` |

## `async` (on `<script>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `async=(string)`| (changed)| `<boolean: true>` |
| `async=(empty string)`| (initial)| `<boolean: false>` |
| `async=(array with string)`| (changed)| `<boolean: true>` |
| `async=(empty array)`| (changed)| `<boolean: true>` |
| `async=(object)`| (changed)| `<boolean: true>` |
| `async=(numeric string)`| (changed)| `<boolean: true>` |
| `async=(-1)`| (changed)| `<boolean: true>` |
| `async=(0)`| (initial)| `<boolean: false>` |
| `async=(integer)`| (changed)| `<boolean: true>` |
| `async=(NaN)`| (initial, warning)| `<boolean: false>` |
| `async=(float)`| (changed)| `<boolean: true>` |
| `async=(true)`| (changed)| `<boolean: true>` |
| `async=(false)`| (initial)| `<boolean: false>` |
| `async=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `async=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `async=(string 'on')`| (changed)| `<boolean: true>` |
| `async=(string 'off')`| (changed)| `<boolean: true>` |
| `async=(symbol)`| (initial, warning)| `<boolean: false>` |
| `async=(function)`| (initial, warning)| `<boolean: false>` |
| `async=(null)`| (initial)| `<boolean: false>` |
| `async=(undefined)`| (initial)| `<boolean: false>` |

## `attributeName` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `attributeName=(string)`| (changed)| `"a string"` |
| `attributeName=(empty string)`| (changed)| `<empty string>` |
| `attributeName=(array with string)`| (changed)| `"string"` |
| `attributeName=(empty array)`| (changed)| `<empty string>` |
| `attributeName=(object)`| (changed)| `"result of toString()"` |
| `attributeName=(numeric string)`| (changed)| `"42"` |
| `attributeName=(-1)`| (changed)| `"-1"` |
| `attributeName=(0)`| (changed)| `"0"` |
| `attributeName=(integer)`| (changed)| `"1"` |
| `attributeName=(NaN)`| (changed, warning)| `"NaN"` |
| `attributeName=(float)`| (changed)| `"99.99"` |
| `attributeName=(true)`| (initial, warning)| `<null>` |
| `attributeName=(false)`| (initial, warning)| `<null>` |
| `attributeName=(string 'true')`| (changed)| `"true"` |
| `attributeName=(string 'false')`| (changed)| `"false"` |
| `attributeName=(string 'on')`| (changed)| `"on"` |
| `attributeName=(string 'off')`| (changed)| `"off"` |
| `attributeName=(symbol)`| (initial, warning)| `<null>` |
| `attributeName=(function)`| (initial, warning)| `<null>` |
| `attributeName=(null)`| (initial)| `<null>` |
| `attributeName=(undefined)`| (initial)| `<null>` |

## `attributeType` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `attributeType=(string)`| (changed)| `"a string"` |
| `attributeType=(empty string)`| (changed)| `<empty string>` |
| `attributeType=(array with string)`| (changed)| `"string"` |
| `attributeType=(empty array)`| (changed)| `<empty string>` |
| `attributeType=(object)`| (changed)| `"result of toString()"` |
| `attributeType=(numeric string)`| (changed)| `"42"` |
| `attributeType=(-1)`| (changed)| `"-1"` |
| `attributeType=(0)`| (changed)| `"0"` |
| `attributeType=(integer)`| (changed)| `"1"` |
| `attributeType=(NaN)`| (changed, warning)| `"NaN"` |
| `attributeType=(float)`| (changed)| `"99.99"` |
| `attributeType=(true)`| (initial, warning)| `<null>` |
| `attributeType=(false)`| (initial, warning)| `<null>` |
| `attributeType=(string 'true')`| (changed)| `"true"` |
| `attributeType=(string 'false')`| (changed)| `"false"` |
| `attributeType=(string 'on')`| (changed)| `"on"` |
| `attributeType=(string 'off')`| (changed)| `"off"` |
| `attributeType=(symbol)`| (initial, warning)| `<null>` |
| `attributeType=(function)`| (initial, warning)| `<null>` |
| `attributeType=(null)`| (initial)| `<null>` |
| `attributeType=(undefined)`| (initial)| `<null>` |

## `autoCapitalize` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `autoCapitalize=(string)`| (changed)| `"words"` |
| `autoCapitalize=(empty string)`| (initial)| `<empty string>` |
| `autoCapitalize=(array with string)`| (changed)| `"words"` |
| `autoCapitalize=(empty array)`| (initial)| `<empty string>` |
| `autoCapitalize=(object)`| (changed)| `"sentences"` |
| `autoCapitalize=(numeric string)`| (changed)| `"sentences"` |
| `autoCapitalize=(-1)`| (changed)| `"sentences"` |
| `autoCapitalize=(0)`| (changed)| `"sentences"` |
| `autoCapitalize=(integer)`| (changed)| `"sentences"` |
| `autoCapitalize=(NaN)`| (changed, warning)| `"sentences"` |
| `autoCapitalize=(float)`| (changed)| `"sentences"` |
| `autoCapitalize=(true)`| (initial, warning)| `<empty string>` |
| `autoCapitalize=(false)`| (initial, warning)| `<empty string>` |
| `autoCapitalize=(string 'true')`| (changed)| `"sentences"` |
| `autoCapitalize=(string 'false')`| (changed)| `"sentences"` |
| `autoCapitalize=(string 'on')`| (changed)| `"sentences"` |
| `autoCapitalize=(string 'off')`| (changed)| `"none"` |
| `autoCapitalize=(symbol)`| (initial, warning)| `<empty string>` |
| `autoCapitalize=(function)`| (initial, warning)| `<empty string>` |
| `autoCapitalize=(null)`| (initial)| `<empty string>` |
| `autoCapitalize=(undefined)`| (initial)| `<empty string>` |

## `autoComplete` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `autoComplete=(string)`| (changed)| `"email"` |
| `autoComplete=(empty string)`| (initial)| `<empty string>` |
| `autoComplete=(array with string)`| (changed)| `"email"` |
| `autoComplete=(empty array)`| (initial)| `<empty string>` |
| `autoComplete=(object)`| (initial)| `<empty string>` |
| `autoComplete=(numeric string)`| (initial)| `<empty string>` |
| `autoComplete=(-1)`| (initial)| `<empty string>` |
| `autoComplete=(0)`| (initial)| `<empty string>` |
| `autoComplete=(integer)`| (initial)| `<empty string>` |
| `autoComplete=(NaN)`| (initial, warning)| `<empty string>` |
| `autoComplete=(float)`| (initial)| `<empty string>` |
| `autoComplete=(true)`| (initial, warning)| `<empty string>` |
| `autoComplete=(false)`| (initial, warning)| `<empty string>` |
| `autoComplete=(string 'true')`| (initial)| `<empty string>` |
| `autoComplete=(string 'false')`| (initial)| `<empty string>` |
| `autoComplete=(string 'on')`| (changed)| `"on"` |
| `autoComplete=(string 'off')`| (changed)| `"off"` |
| `autoComplete=(symbol)`| (initial, warning)| `<empty string>` |
| `autoComplete=(function)`| (initial, warning)| `<empty string>` |
| `autoComplete=(null)`| (initial)| `<empty string>` |
| `autoComplete=(undefined)`| (initial)| `<empty string>` |

## `autoCorrect` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `autoCorrect=(string)`| (changed)| `"off"` |
| `autoCorrect=(empty string)`| (changed)| `<empty string>` |
| `autoCorrect=(array with string)`| (changed)| `"off"` |
| `autoCorrect=(empty array)`| (changed)| `<empty string>` |
| `autoCorrect=(object)`| (changed)| `"result of toString()"` |
| `autoCorrect=(numeric string)`| (changed)| `"42"` |
| `autoCorrect=(-1)`| (changed)| `"-1"` |
| `autoCorrect=(0)`| (changed)| `"0"` |
| `autoCorrect=(integer)`| (changed)| `"1"` |
| `autoCorrect=(NaN)`| (changed, warning)| `"NaN"` |
| `autoCorrect=(float)`| (changed)| `"99.99"` |
| `autoCorrect=(true)`| (initial, warning)| `<null>` |
| `autoCorrect=(false)`| (initial, warning)| `<null>` |
| `autoCorrect=(string 'true')`| (changed)| `"true"` |
| `autoCorrect=(string 'false')`| (changed)| `"false"` |
| `autoCorrect=(string 'on')`| (changed)| `"on"` |
| `autoCorrect=(string 'off')`| (changed)| `"off"` |
| `autoCorrect=(symbol)`| (initial, warning)| `<null>` |
| `autoCorrect=(function)`| (initial, warning)| `<null>` |
| `autoCorrect=(null)`| (initial)| `<null>` |
| `autoCorrect=(undefined)`| (initial)| `<null>` |

## `autoPlay` (on `<video>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `autoPlay=(string)`| (changed)| `<boolean: true>` |
| `autoPlay=(empty string)`| (initial)| `<boolean: false>` |
| `autoPlay=(array with string)`| (changed)| `<boolean: true>` |
| `autoPlay=(empty array)`| (changed)| `<boolean: true>` |
| `autoPlay=(object)`| (changed)| `<boolean: true>` |
| `autoPlay=(numeric string)`| (changed)| `<boolean: true>` |
| `autoPlay=(-1)`| (changed)| `<boolean: true>` |
| `autoPlay=(0)`| (initial)| `<boolean: false>` |
| `autoPlay=(integer)`| (changed)| `<boolean: true>` |
| `autoPlay=(NaN)`| (initial, warning)| `<boolean: false>` |
| `autoPlay=(float)`| (changed)| `<boolean: true>` |
| `autoPlay=(true)`| (changed)| `<boolean: true>` |
| `autoPlay=(false)`| (initial)| `<boolean: false>` |
| `autoPlay=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `autoPlay=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `autoPlay=(string 'on')`| (changed)| `<boolean: true>` |
| `autoPlay=(string 'off')`| (changed)| `<boolean: true>` |
| `autoPlay=(symbol)`| (initial, warning)| `<boolean: false>` |
| `autoPlay=(function)`| (initial, warning)| `<boolean: false>` |
| `autoPlay=(null)`| (initial)| `<boolean: false>` |
| `autoPlay=(undefined)`| (initial)| `<boolean: false>` |

## `autoReverse` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `autoReverse=(string)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(empty string)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(array with string)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(empty array)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(object)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(numeric string)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(-1)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(0)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(integer)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(NaN)`| (initial, warning, ssr mismatch)| `<null>` |
| `autoReverse=(float)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(true)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(false)`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(string 'true')`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(string 'false')`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(string 'on')`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(string 'off')`| (initial, ssr mismatch)| `<null>` |
| `autoReverse=(symbol)`| (initial, warning)| `<null>` |
| `autoReverse=(function)`| (initial, warning)| `<null>` |
| `autoReverse=(null)`| (initial)| `<null>` |
| `autoReverse=(undefined)`| (initial)| `<null>` |

## `autoSave` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `autoSave=(string)`| (changed)| `"a string"` |
| `autoSave=(empty string)`| (changed)| `<empty string>` |
| `autoSave=(array with string)`| (changed)| `"string"` |
| `autoSave=(empty array)`| (changed)| `<empty string>` |
| `autoSave=(object)`| (changed)| `"result of toString()"` |
| `autoSave=(numeric string)`| (changed)| `"42"` |
| `autoSave=(-1)`| (changed)| `"-1"` |
| `autoSave=(0)`| (changed)| `"0"` |
| `autoSave=(integer)`| (changed)| `"1"` |
| `autoSave=(NaN)`| (changed, warning)| `"NaN"` |
| `autoSave=(float)`| (changed)| `"99.99"` |
| `autoSave=(true)`| (initial, warning)| `<null>` |
| `autoSave=(false)`| (initial, warning)| `<null>` |
| `autoSave=(string 'true')`| (changed)| `"true"` |
| `autoSave=(string 'false')`| (changed)| `"false"` |
| `autoSave=(string 'on')`| (changed)| `"on"` |
| `autoSave=(string 'off')`| (changed)| `"off"` |
| `autoSave=(symbol)`| (initial, warning)| `<null>` |
| `autoSave=(function)`| (initial, warning)| `<null>` |
| `autoSave=(null)`| (initial)| `<null>` |
| `autoSave=(undefined)`| (initial)| `<null>` |

## `azimuth` (on `<feDistantLight>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `azimuth=(string)`| (initial)| `<number: 0>` |
| `azimuth=(empty string)`| (initial)| `<number: 0>` |
| `azimuth=(array with string)`| (initial)| `<number: 0>` |
| `azimuth=(empty array)`| (initial)| `<number: 0>` |
| `azimuth=(object)`| (initial)| `<number: 0>` |
| `azimuth=(numeric string)`| (changed)| `<number: 42>` |
| `azimuth=(-1)`| (changed)| `<number: -1>` |
| `azimuth=(0)`| (initial)| `<number: 0>` |
| `azimuth=(integer)`| (changed)| `<number: 1>` |
| `azimuth=(NaN)`| (initial, warning)| `<number: 0>` |
| `azimuth=(float)`| (changed)| `<number: 99.98999786376953>` |
| `azimuth=(true)`| (initial, warning)| `<number: 0>` |
| `azimuth=(false)`| (initial, warning)| `<number: 0>` |
| `azimuth=(string 'true')`| (initial)| `<number: 0>` |
| `azimuth=(string 'false')`| (initial)| `<number: 0>` |
| `azimuth=(string 'on')`| (initial)| `<number: 0>` |
| `azimuth=(string 'off')`| (initial)| `<number: 0>` |
| `azimuth=(symbol)`| (initial, warning)| `<number: 0>` |
| `azimuth=(function)`| (initial, warning)| `<number: 0>` |
| `azimuth=(null)`| (initial)| `<number: 0>` |
| `azimuth=(undefined)`| (initial)| `<number: 0>` |

## `baseFrequency` (on `<feTurbulence>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `baseFrequency=(string)`| (changed)| `"a string"` |
| `baseFrequency=(empty string)`| (changed)| `<empty string>` |
| `baseFrequency=(array with string)`| (changed)| `"string"` |
| `baseFrequency=(empty array)`| (changed)| `<empty string>` |
| `baseFrequency=(object)`| (changed)| `"result of toString()"` |
| `baseFrequency=(numeric string)`| (changed)| `"42"` |
| `baseFrequency=(-1)`| (changed)| `"-1"` |
| `baseFrequency=(0)`| (changed)| `"0"` |
| `baseFrequency=(integer)`| (changed)| `"1"` |
| `baseFrequency=(NaN)`| (changed, warning)| `"NaN"` |
| `baseFrequency=(float)`| (changed)| `"99.99"` |
| `baseFrequency=(true)`| (initial, warning)| `<null>` |
| `baseFrequency=(false)`| (initial, warning)| `<null>` |
| `baseFrequency=(string 'true')`| (changed)| `"true"` |
| `baseFrequency=(string 'false')`| (changed)| `"false"` |
| `baseFrequency=(string 'on')`| (changed)| `"on"` |
| `baseFrequency=(string 'off')`| (changed)| `"off"` |
| `baseFrequency=(symbol)`| (initial, warning)| `<null>` |
| `baseFrequency=(function)`| (initial, warning)| `<null>` |
| `baseFrequency=(null)`| (initial)| `<null>` |
| `baseFrequency=(undefined)`| (initial)| `<null>` |

## `baseline-shift` (on `<textPath>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `baseline-shift=(string)`| (changed, warning)| `"a string"` |
| `baseline-shift=(empty string)`| (changed, warning)| `<empty string>` |
| `baseline-shift=(array with string)`| (changed, warning)| `"string"` |
| `baseline-shift=(empty array)`| (changed, warning)| `<empty string>` |
| `baseline-shift=(object)`| (changed, warning)| `"result of toString()"` |
| `baseline-shift=(numeric string)`| (changed, warning)| `"42"` |
| `baseline-shift=(-1)`| (changed, warning)| `"-1"` |
| `baseline-shift=(0)`| (changed, warning)| `"0"` |
| `baseline-shift=(integer)`| (changed, warning)| `"1"` |
| `baseline-shift=(NaN)`| (changed, warning)| `"NaN"` |
| `baseline-shift=(float)`| (changed, warning)| `"99.99"` |
| `baseline-shift=(true)`| (initial, warning)| `<null>` |
| `baseline-shift=(false)`| (initial, warning)| `<null>` |
| `baseline-shift=(string 'true')`| (changed, warning)| `"true"` |
| `baseline-shift=(string 'false')`| (changed, warning)| `"false"` |
| `baseline-shift=(string 'on')`| (changed, warning)| `"on"` |
| `baseline-shift=(string 'off')`| (changed, warning)| `"off"` |
| `baseline-shift=(symbol)`| (initial, warning)| `<null>` |
| `baseline-shift=(function)`| (initial, warning)| `<null>` |
| `baseline-shift=(null)`| (initial, warning)| `<null>` |
| `baseline-shift=(undefined)`| (initial, warning)| `<null>` |

## `baselineShift` (on `<textPath>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `baselineShift=(string)`| (changed)| `"a string"` |
| `baselineShift=(empty string)`| (changed)| `<empty string>` |
| `baselineShift=(array with string)`| (changed)| `"string"` |
| `baselineShift=(empty array)`| (changed)| `<empty string>` |
| `baselineShift=(object)`| (changed)| `"result of toString()"` |
| `baselineShift=(numeric string)`| (changed)| `"42"` |
| `baselineShift=(-1)`| (changed)| `"-1"` |
| `baselineShift=(0)`| (changed)| `"0"` |
| `baselineShift=(integer)`| (changed)| `"1"` |
| `baselineShift=(NaN)`| (changed, warning)| `"NaN"` |
| `baselineShift=(float)`| (changed)| `"99.99"` |
| `baselineShift=(true)`| (initial, warning)| `<null>` |
| `baselineShift=(false)`| (initial, warning)| `<null>` |
| `baselineShift=(string 'true')`| (changed)| `"true"` |
| `baselineShift=(string 'false')`| (changed)| `"false"` |
| `baselineShift=(string 'on')`| (changed)| `"on"` |
| `baselineShift=(string 'off')`| (changed)| `"off"` |
| `baselineShift=(symbol)`| (initial, warning)| `<null>` |
| `baselineShift=(function)`| (initial, warning)| `<null>` |
| `baselineShift=(null)`| (initial)| `<null>` |
| `baselineShift=(undefined)`| (initial)| `<null>` |

## `baseProfile` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `baseProfile=(string)`| (changed)| `"a string"` |
| `baseProfile=(empty string)`| (changed)| `<empty string>` |
| `baseProfile=(array with string)`| (changed)| `"string"` |
| `baseProfile=(empty array)`| (changed)| `<empty string>` |
| `baseProfile=(object)`| (changed)| `"result of toString()"` |
| `baseProfile=(numeric string)`| (changed)| `"42"` |
| `baseProfile=(-1)`| (changed)| `"-1"` |
| `baseProfile=(0)`| (changed)| `"0"` |
| `baseProfile=(integer)`| (changed)| `"1"` |
| `baseProfile=(NaN)`| (changed, warning)| `"NaN"` |
| `baseProfile=(float)`| (changed)| `"99.99"` |
| `baseProfile=(true)`| (initial, warning)| `<null>` |
| `baseProfile=(false)`| (initial, warning)| `<null>` |
| `baseProfile=(string 'true')`| (changed)| `"true"` |
| `baseProfile=(string 'false')`| (changed)| `"false"` |
| `baseProfile=(string 'on')`| (changed)| `"on"` |
| `baseProfile=(string 'off')`| (changed)| `"off"` |
| `baseProfile=(symbol)`| (initial, warning)| `<null>` |
| `baseProfile=(function)`| (initial, warning)| `<null>` |
| `baseProfile=(null)`| (initial)| `<null>` |
| `baseProfile=(undefined)`| (initial)| `<null>` |

## `bbox` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `bbox=(string)`| (changed)| `"a string"` |
| `bbox=(empty string)`| (changed)| `<empty string>` |
| `bbox=(array with string)`| (changed)| `"string"` |
| `bbox=(empty array)`| (changed)| `<empty string>` |
| `bbox=(object)`| (changed)| `"result of toString()"` |
| `bbox=(numeric string)`| (changed)| `"42"` |
| `bbox=(-1)`| (changed)| `"-1"` |
| `bbox=(0)`| (changed)| `"0"` |
| `bbox=(integer)`| (changed)| `"1"` |
| `bbox=(NaN)`| (changed, warning)| `"NaN"` |
| `bbox=(float)`| (changed)| `"99.99"` |
| `bbox=(true)`| (initial, warning)| `<null>` |
| `bbox=(false)`| (initial, warning)| `<null>` |
| `bbox=(string 'true')`| (changed)| `"true"` |
| `bbox=(string 'false')`| (changed)| `"false"` |
| `bbox=(string 'on')`| (changed)| `"on"` |
| `bbox=(string 'off')`| (changed)| `"off"` |
| `bbox=(symbol)`| (initial, warning)| `<null>` |
| `bbox=(function)`| (initial, warning)| `<null>` |
| `bbox=(null)`| (initial)| `<null>` |
| `bbox=(undefined)`| (initial)| `<null>` |

## `begin` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `begin=(string)`| (changed)| `"a string"` |
| `begin=(empty string)`| (changed)| `<empty string>` |
| `begin=(array with string)`| (changed)| `"string"` |
| `begin=(empty array)`| (changed)| `<empty string>` |
| `begin=(object)`| (changed)| `"result of toString()"` |
| `begin=(numeric string)`| (changed)| `"42"` |
| `begin=(-1)`| (changed)| `"-1"` |
| `begin=(0)`| (changed)| `"0"` |
| `begin=(integer)`| (changed)| `"1"` |
| `begin=(NaN)`| (changed, warning)| `"NaN"` |
| `begin=(float)`| (changed)| `"99.99"` |
| `begin=(true)`| (initial, warning)| `<null>` |
| `begin=(false)`| (initial, warning)| `<null>` |
| `begin=(string 'true')`| (changed)| `"true"` |
| `begin=(string 'false')`| (changed)| `"false"` |
| `begin=(string 'on')`| (changed)| `"on"` |
| `begin=(string 'off')`| (changed)| `"off"` |
| `begin=(symbol)`| (initial, warning)| `<null>` |
| `begin=(function)`| (initial, warning)| `<null>` |
| `begin=(null)`| (initial)| `<null>` |
| `begin=(undefined)`| (initial)| `<null>` |

## `bias` (on `<feConvolveMatrix>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `bias=(string)`| (initial)| `<number: 0>` |
| `bias=(empty string)`| (initial)| `<number: 0>` |
| `bias=(array with string)`| (initial)| `<number: 0>` |
| `bias=(empty array)`| (initial)| `<number: 0>` |
| `bias=(object)`| (initial)| `<number: 0>` |
| `bias=(numeric string)`| (changed)| `<number: 42>` |
| `bias=(-1)`| (changed)| `<number: -1>` |
| `bias=(0)`| (initial)| `<number: 0>` |
| `bias=(integer)`| (changed)| `<number: 1>` |
| `bias=(NaN)`| (initial, warning)| `<number: 0>` |
| `bias=(float)`| (changed)| `<number: 99.98999786376953>` |
| `bias=(true)`| (initial, warning)| `<number: 0>` |
| `bias=(false)`| (initial, warning)| `<number: 0>` |
| `bias=(string 'true')`| (initial)| `<number: 0>` |
| `bias=(string 'false')`| (initial)| `<number: 0>` |
| `bias=(string 'on')`| (initial)| `<number: 0>` |
| `bias=(string 'off')`| (initial)| `<number: 0>` |
| `bias=(symbol)`| (initial, warning)| `<number: 0>` |
| `bias=(function)`| (initial, warning)| `<number: 0>` |
| `bias=(null)`| (initial)| `<number: 0>` |
| `bias=(undefined)`| (initial)| `<number: 0>` |

## `by` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `by=(string)`| (changed)| `"a string"` |
| `by=(empty string)`| (changed)| `<empty string>` |
| `by=(array with string)`| (changed)| `"string"` |
| `by=(empty array)`| (changed)| `<empty string>` |
| `by=(object)`| (changed)| `"result of toString()"` |
| `by=(numeric string)`| (changed)| `"42"` |
| `by=(-1)`| (changed)| `"-1"` |
| `by=(0)`| (changed)| `"0"` |
| `by=(integer)`| (changed)| `"1"` |
| `by=(NaN)`| (changed, warning)| `"NaN"` |
| `by=(float)`| (changed)| `"99.99"` |
| `by=(true)`| (initial, warning)| `<null>` |
| `by=(false)`| (initial, warning)| `<null>` |
| `by=(string 'true')`| (changed)| `"true"` |
| `by=(string 'false')`| (changed)| `"false"` |
| `by=(string 'on')`| (changed)| `"on"` |
| `by=(string 'off')`| (changed)| `"off"` |
| `by=(symbol)`| (initial, warning)| `<null>` |
| `by=(function)`| (initial, warning)| `<null>` |
| `by=(null)`| (initial)| `<null>` |
| `by=(undefined)`| (initial)| `<null>` |

## `calcMode` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `calcMode=(string)`| (changed)| `"discrete"` |
| `calcMode=(empty string)`| (changed)| `<empty string>` |
| `calcMode=(array with string)`| (changed)| `"discrete"` |
| `calcMode=(empty array)`| (changed)| `<empty string>` |
| `calcMode=(object)`| (changed)| `"result of toString()"` |
| `calcMode=(numeric string)`| (changed)| `"42"` |
| `calcMode=(-1)`| (changed)| `"-1"` |
| `calcMode=(0)`| (changed)| `"0"` |
| `calcMode=(integer)`| (changed)| `"1"` |
| `calcMode=(NaN)`| (changed, warning)| `"NaN"` |
| `calcMode=(float)`| (changed)| `"99.99"` |
| `calcMode=(true)`| (initial, warning)| `<null>` |
| `calcMode=(false)`| (initial, warning)| `<null>` |
| `calcMode=(string 'true')`| (changed)| `"true"` |
| `calcMode=(string 'false')`| (changed)| `"false"` |
| `calcMode=(string 'on')`| (changed)| `"on"` |
| `calcMode=(string 'off')`| (changed)| `"off"` |
| `calcMode=(symbol)`| (initial, warning)| `<null>` |
| `calcMode=(function)`| (initial, warning)| `<null>` |
| `calcMode=(null)`| (initial)| `<null>` |
| `calcMode=(undefined)`| (initial)| `<null>` |

## `cap-height` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `cap-height=(string)`| (changed, warning)| `"a string"` |
| `cap-height=(empty string)`| (changed, warning)| `<empty string>` |
| `cap-height=(array with string)`| (changed, warning)| `"string"` |
| `cap-height=(empty array)`| (changed, warning)| `<empty string>` |
| `cap-height=(object)`| (changed, warning)| `"result of toString()"` |
| `cap-height=(numeric string)`| (changed, warning)| `"42"` |
| `cap-height=(-1)`| (changed, warning)| `"-1"` |
| `cap-height=(0)`| (changed, warning)| `"0"` |
| `cap-height=(integer)`| (changed, warning)| `"1"` |
| `cap-height=(NaN)`| (changed, warning)| `"NaN"` |
| `cap-height=(float)`| (changed, warning)| `"99.99"` |
| `cap-height=(true)`| (initial, warning)| `<null>` |
| `cap-height=(false)`| (initial, warning)| `<null>` |
| `cap-height=(string 'true')`| (changed, warning)| `"true"` |
| `cap-height=(string 'false')`| (changed, warning)| `"false"` |
| `cap-height=(string 'on')`| (changed, warning)| `"on"` |
| `cap-height=(string 'off')`| (changed, warning)| `"off"` |
| `cap-height=(symbol)`| (initial, warning)| `<null>` |
| `cap-height=(function)`| (initial, warning)| `<null>` |
| `cap-height=(null)`| (initial, warning)| `<null>` |
| `cap-height=(undefined)`| (initial, warning)| `<null>` |

## `capHeight` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `capHeight=(string)`| (changed)| `"a string"` |
| `capHeight=(empty string)`| (changed)| `<empty string>` |
| `capHeight=(array with string)`| (changed)| `"string"` |
| `capHeight=(empty array)`| (changed)| `<empty string>` |
| `capHeight=(object)`| (changed)| `"result of toString()"` |
| `capHeight=(numeric string)`| (changed)| `"42"` |
| `capHeight=(-1)`| (changed)| `"-1"` |
| `capHeight=(0)`| (changed)| `"0"` |
| `capHeight=(integer)`| (changed)| `"1"` |
| `capHeight=(NaN)`| (changed, warning)| `"NaN"` |
| `capHeight=(float)`| (changed)| `"99.99"` |
| `capHeight=(true)`| (initial, warning)| `<null>` |
| `capHeight=(false)`| (initial, warning)| `<null>` |
| `capHeight=(string 'true')`| (changed)| `"true"` |
| `capHeight=(string 'false')`| (changed)| `"false"` |
| `capHeight=(string 'on')`| (changed)| `"on"` |
| `capHeight=(string 'off')`| (changed)| `"off"` |
| `capHeight=(symbol)`| (initial, warning)| `<null>` |
| `capHeight=(function)`| (initial, warning)| `<null>` |
| `capHeight=(null)`| (initial)| `<null>` |
| `capHeight=(undefined)`| (initial)| `<null>` |

## `capture` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `capture=(string)`| (changed)| `"environment"` |
| `capture=(empty string)`| (changed)| `<empty string>` |
| `capture=(array with string)`| (changed)| `"environment"` |
| `capture=(empty array)`| (changed)| `<empty string>` |
| `capture=(object)`| (changed)| `"result of toString()"` |
| `capture=(numeric string)`| (changed)| `"42"` |
| `capture=(-1)`| (changed)| `"-1"` |
| `capture=(0)`| (changed)| `"0"` |
| `capture=(integer)`| (changed)| `"1"` |
| `capture=(NaN)`| (changed, warning)| `"NaN"` |
| `capture=(float)`| (changed)| `"99.99"` |
| `capture=(true)`| (changed)| `<empty string>` |
| `capture=(false)`| (initial)| `<null>` |
| `capture=(string 'true')`| (changed)| `"true"` |
| `capture=(string 'false')`| (changed)| `"false"` |
| `capture=(string 'on')`| (changed)| `"on"` |
| `capture=(string 'off')`| (changed)| `"off"` |
| `capture=(symbol)`| (initial, warning)| `<null>` |
| `capture=(function)`| (initial, warning)| `<null>` |
| `capture=(null)`| (initial)| `<null>` |
| `capture=(undefined)`| (initial)| `<null>` |

## `cellPadding` (on `<table>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `cellPadding=(string)`| (changed)| `"a string"` |
| `cellPadding=(empty string)`| (initial)| `<empty string>` |
| `cellPadding=(array with string)`| (changed)| `"string"` |
| `cellPadding=(empty array)`| (initial)| `<empty string>` |
| `cellPadding=(object)`| (changed)| `"result of toString()"` |
| `cellPadding=(numeric string)`| (changed)| `"42"` |
| `cellPadding=(-1)`| (changed)| `"-1"` |
| `cellPadding=(0)`| (changed)| `"0"` |
| `cellPadding=(integer)`| (changed)| `"1"` |
| `cellPadding=(NaN)`| (changed, warning)| `"NaN"` |
| `cellPadding=(float)`| (changed)| `"99.99"` |
| `cellPadding=(true)`| (initial, warning)| `<empty string>` |
| `cellPadding=(false)`| (initial, warning)| `<empty string>` |
| `cellPadding=(string 'true')`| (changed)| `"true"` |
| `cellPadding=(string 'false')`| (changed)| `"false"` |
| `cellPadding=(string 'on')`| (changed)| `"on"` |
| `cellPadding=(string 'off')`| (changed)| `"off"` |
| `cellPadding=(symbol)`| (initial, warning)| `<empty string>` |
| `cellPadding=(function)`| (initial, warning)| `<empty string>` |
| `cellPadding=(null)`| (initial)| `<empty string>` |
| `cellPadding=(undefined)`| (initial)| `<empty string>` |

## `cellSpacing` (on `<table>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `cellSpacing=(string)`| (changed)| `"a string"` |
| `cellSpacing=(empty string)`| (initial)| `<empty string>` |
| `cellSpacing=(array with string)`| (changed)| `"string"` |
| `cellSpacing=(empty array)`| (initial)| `<empty string>` |
| `cellSpacing=(object)`| (changed)| `"result of toString()"` |
| `cellSpacing=(numeric string)`| (changed)| `"42"` |
| `cellSpacing=(-1)`| (changed)| `"-1"` |
| `cellSpacing=(0)`| (changed)| `"0"` |
| `cellSpacing=(integer)`| (changed)| `"1"` |
| `cellSpacing=(NaN)`| (changed, warning)| `"NaN"` |
| `cellSpacing=(float)`| (changed)| `"99.99"` |
| `cellSpacing=(true)`| (initial, warning)| `<empty string>` |
| `cellSpacing=(false)`| (initial, warning)| `<empty string>` |
| `cellSpacing=(string 'true')`| (changed)| `"true"` |
| `cellSpacing=(string 'false')`| (changed)| `"false"` |
| `cellSpacing=(string 'on')`| (changed)| `"on"` |
| `cellSpacing=(string 'off')`| (changed)| `"off"` |
| `cellSpacing=(symbol)`| (initial, warning)| `<empty string>` |
| `cellSpacing=(function)`| (initial, warning)| `<empty string>` |
| `cellSpacing=(null)`| (initial)| `<empty string>` |
| `cellSpacing=(undefined)`| (initial)| `<empty string>` |

## `challenge` (on `<keygen>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `challenge=(string)`| (changed, warning, ssr warning)| `"a string"` |
| `challenge=(empty string)`| (changed, warning, ssr warning)| `<empty string>` |
| `challenge=(array with string)`| (changed, warning, ssr warning)| `"string"` |
| `challenge=(empty array)`| (changed, warning, ssr warning)| `<empty string>` |
| `challenge=(object)`| (changed, warning, ssr warning)| `"result of toString()"` |
| `challenge=(numeric string)`| (changed, warning, ssr warning)| `"42"` |
| `challenge=(-1)`| (changed, warning, ssr warning)| `"-1"` |
| `challenge=(0)`| (changed, warning, ssr warning)| `"0"` |
| `challenge=(integer)`| (changed, warning, ssr warning)| `"1"` |
| `challenge=(NaN)`| (changed, warning)| `"NaN"` |
| `challenge=(float)`| (changed, warning, ssr warning)| `"99.99"` |
| `challenge=(true)`| (initial, warning)| `<null>` |
| `challenge=(false)`| (initial, warning)| `<null>` |
| `challenge=(string 'true')`| (changed, warning, ssr warning)| `"true"` |
| `challenge=(string 'false')`| (changed, warning, ssr warning)| `"false"` |
| `challenge=(string 'on')`| (changed, warning, ssr warning)| `"on"` |
| `challenge=(string 'off')`| (changed, warning, ssr warning)| `"off"` |
| `challenge=(symbol)`| (initial, warning)| `<null>` |
| `challenge=(function)`| (initial, warning)| `<null>` |
| `challenge=(null)`| (initial, warning, ssr warning)| `<null>` |
| `challenge=(undefined)`| (initial, warning, ssr warning)| `<null>` |

## `charSet` (on `<script>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `charSet=(string)`| (changed)| `"a string"` |
| `charSet=(empty string)`| (initial)| `<empty string>` |
| `charSet=(array with string)`| (changed)| `"string"` |
| `charSet=(empty array)`| (initial)| `<empty string>` |
| `charSet=(object)`| (changed)| `"result of toString()"` |
| `charSet=(numeric string)`| (changed)| `"42"` |
| `charSet=(-1)`| (changed)| `"-1"` |
| `charSet=(0)`| (changed)| `"0"` |
| `charSet=(integer)`| (changed)| `"1"` |
| `charSet=(NaN)`| (changed, warning)| `"NaN"` |
| `charSet=(float)`| (changed)| `"99.99"` |
| `charSet=(true)`| (initial, warning)| `<empty string>` |
| `charSet=(false)`| (initial, warning)| `<empty string>` |
| `charSet=(string 'true')`| (changed)| `"true"` |
| `charSet=(string 'false')`| (changed)| `"false"` |
| `charSet=(string 'on')`| (changed)| `"on"` |
| `charSet=(string 'off')`| (changed)| `"off"` |
| `charSet=(symbol)`| (initial, warning)| `<empty string>` |
| `charSet=(function)`| (initial, warning)| `<empty string>` |
| `charSet=(null)`| (initial)| `<empty string>` |
| `charSet=(undefined)`| (initial)| `<empty string>` |

## `checked` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `checked=(string)`| (changed)| `<boolean: true>` |
| `checked=(empty string)`| (initial)| `<boolean: false>` |
| `checked=(array with string)`| (changed)| `<boolean: true>` |
| `checked=(empty array)`| (changed)| `<boolean: true>` |
| `checked=(object)`| (changed)| `<boolean: true>` |
| `checked=(numeric string)`| (changed)| `<boolean: true>` |
| `checked=(-1)`| (changed)| `<boolean: true>` |
| `checked=(0)`| (initial)| `<boolean: false>` |
| `checked=(integer)`| (changed)| `<boolean: true>` |
| `checked=(NaN)`| (initial, warning)| `<boolean: false>` |
| `checked=(float)`| (changed)| `<boolean: true>` |
| `checked=(true)`| (changed)| `<boolean: true>` |
| `checked=(false)`| (initial)| `<boolean: false>` |
| `checked=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `checked=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `checked=(string 'on')`| (changed)| `<boolean: true>` |
| `checked=(string 'off')`| (changed)| `<boolean: true>` |
| `checked=(symbol)`| (initial, warning)| `<boolean: false>` |
| `checked=(function)`| (initial, warning)| `<boolean: false>` |
| `checked=(null)`| (initial)| `<boolean: false>` |
| `checked=(undefined)`| (initial)| `<boolean: false>` |

## `Checked` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `Checked=(string)`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(empty string)`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(array with string)`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(empty array)`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(object)`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(numeric string)`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(-1)`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(0)`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(integer)`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(NaN)`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(float)`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(true)`| (initial, warning)| `<null>` |
| `Checked=(false)`| (initial, warning)| `<null>` |
| `Checked=(string 'true')`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(string 'false')`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(string 'on')`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(string 'off')`| (initial, warning, ssr mismatch)| `<null>` |
| `Checked=(symbol)`| (initial, warning)| `<null>` |
| `Checked=(function)`| (initial, warning)| `<null>` |
| `Checked=(null)`| (initial, warning)| `<null>` |
| `Checked=(undefined)`| (initial, warning)| `<null>` |

## `Children` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `Children=(string)`| (changed, warning)| `"a string"` |
| `Children=(empty string)`| (changed, warning)| `<empty string>` |
| `Children=(array with string)`| (changed, warning)| `"string"` |
| `Children=(empty array)`| (changed, warning)| `<empty string>` |
| `Children=(object)`| (changed, warning)| `"result of toString()"` |
| `Children=(numeric string)`| (changed, warning)| `"42"` |
| `Children=(-1)`| (changed, warning)| `"-1"` |
| `Children=(0)`| (changed, warning)| `"0"` |
| `Children=(integer)`| (changed, warning)| `"1"` |
| `Children=(NaN)`| (changed, warning)| `"NaN"` |
| `Children=(float)`| (changed, warning)| `"99.99"` |
| `Children=(true)`| (initial, warning)| `<null>` |
| `Children=(false)`| (initial, warning)| `<null>` |
| `Children=(string 'true')`| (changed, warning)| `"true"` |
| `Children=(string 'false')`| (changed, warning)| `"false"` |
| `Children=(string 'on')`| (changed, warning)| `"on"` |
| `Children=(string 'off')`| (changed, warning)| `"off"` |
| `Children=(symbol)`| (initial, warning)| `<null>` |
| `Children=(function)`| (initial, warning)| `<null>` |
| `Children=(null)`| (initial, warning)| `<null>` |
| `Children=(undefined)`| (initial, warning)| `<null>` |

## `children` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `children=(string)`| (initial)| `[]` |
| `children=(empty string)`| (initial)| `[]` |
| `children=(array with string)`| (initial)| `[]` |
| `children=(empty array)`| (initial)| `[]` |
| `children=(object)`| (changed, error, warning, ssr error)| `` |
| `children=(numeric string)`| (initial)| `[]` |
| `children=(-1)`| (initial)| `[]` |
| `children=(0)`| (initial)| `[]` |
| `children=(integer)`| (initial)| `[]` |
| `children=(NaN)`| (initial, warning)| `[]` |
| `children=(float)`| (initial)| `[]` |
| `children=(true)`| (initial)| `[]` |
| `children=(false)`| (initial)| `[]` |
| `children=(string 'true')`| (initial)| `[]` |
| `children=(string 'false')`| (initial)| `[]` |
| `children=(string 'on')`| (initial)| `[]` |
| `children=(string 'off')`| (initial)| `[]` |
| `children=(symbol)`| (initial)| `[]` |
| `children=(function)`| (initial, warning)| `[]` |
| `children=(null)`| (initial)| `[]` |
| `children=(undefined)`| (initial)| `[]` |

## `cite` (on `<blockquote>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `cite=(string)`| (changed)| `"https://reactjs.com/"` |
| `cite=(empty string)`| (changed)| `"http://localhost:3000/"` |
| `cite=(array with string)`| (changed)| `"https://reactjs.com/"` |
| `cite=(empty array)`| (changed)| `"http://localhost:3000/"` |
| `cite=(object)`| (changed)| `"http://localhost:3000/result%20of%20toString()"` |
| `cite=(numeric string)`| (changed)| `"http://localhost:3000/42"` |
| `cite=(-1)`| (changed)| `"http://localhost:3000/-1"` |
| `cite=(0)`| (changed)| `"http://localhost:3000/0"` |
| `cite=(integer)`| (changed)| `"http://localhost:3000/1"` |
| `cite=(NaN)`| (changed, warning)| `"http://localhost:3000/NaN"` |
| `cite=(float)`| (changed)| `"http://localhost:3000/99.99"` |
| `cite=(true)`| (initial, warning)| `<empty string>` |
| `cite=(false)`| (initial, warning)| `<empty string>` |
| `cite=(string 'true')`| (changed)| `"http://localhost:3000/true"` |
| `cite=(string 'false')`| (changed)| `"http://localhost:3000/false"` |
| `cite=(string 'on')`| (changed)| `"http://localhost:3000/on"` |
| `cite=(string 'off')`| (changed)| `"http://localhost:3000/off"` |
| `cite=(symbol)`| (initial, warning)| `<empty string>` |
| `cite=(function)`| (initial, warning)| `<empty string>` |
| `cite=(null)`| (initial)| `<empty string>` |
| `cite=(undefined)`| (initial)| `<empty string>` |

## `class` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `class=(string)`| (changed, warning)| `"a string"` |
| `class=(empty string)`| (changed, warning)| `<empty string>` |
| `class=(array with string)`| (changed, warning)| `"string"` |
| `class=(empty array)`| (changed, warning)| `<empty string>` |
| `class=(object)`| (changed, warning)| `"result of toString()"` |
| `class=(numeric string)`| (changed, warning)| `"42"` |
| `class=(-1)`| (changed, warning)| `"-1"` |
| `class=(0)`| (changed, warning)| `"0"` |
| `class=(integer)`| (changed, warning)| `"1"` |
| `class=(NaN)`| (changed, warning)| `"NaN"` |
| `class=(float)`| (changed, warning)| `"99.99"` |
| `class=(true)`| (initial, warning)| `<null>` |
| `class=(false)`| (initial, warning)| `<null>` |
| `class=(string 'true')`| (changed, warning)| `"true"` |
| `class=(string 'false')`| (changed, warning)| `"false"` |
| `class=(string 'on')`| (changed, warning)| `"on"` |
| `class=(string 'off')`| (changed, warning)| `"off"` |
| `class=(symbol)`| (initial, warning)| `<null>` |
| `class=(function)`| (initial, warning)| `<null>` |
| `class=(null)`| (initial, warning)| `<null>` |
| `class=(undefined)`| (initial, warning)| `<null>` |

## `classID` (on `<object>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `classID=(string)`| (changed)| `"a string"` |
| `classID=(empty string)`| (changed)| `<empty string>` |
| `classID=(array with string)`| (changed)| `"string"` |
| `classID=(empty array)`| (changed)| `<empty string>` |
| `classID=(object)`| (changed)| `"result of toString()"` |
| `classID=(numeric string)`| (changed)| `"42"` |
| `classID=(-1)`| (changed)| `"-1"` |
| `classID=(0)`| (changed)| `"0"` |
| `classID=(integer)`| (changed)| `"1"` |
| `classID=(NaN)`| (changed, warning)| `"NaN"` |
| `classID=(float)`| (changed)| `"99.99"` |
| `classID=(true)`| (initial, warning)| `<null>` |
| `classID=(false)`| (initial, warning)| `<null>` |
| `classID=(string 'true')`| (changed)| `"true"` |
| `classID=(string 'false')`| (changed)| `"false"` |
| `classID=(string 'on')`| (changed)| `"on"` |
| `classID=(string 'off')`| (changed)| `"off"` |
| `classID=(symbol)`| (initial, warning)| `<null>` |
| `classID=(function)`| (initial, warning)| `<null>` |
| `classID=(null)`| (initial)| `<null>` |
| `classID=(undefined)`| (initial)| `<null>` |

## `className` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `className=(string)`| (changed)| `"a string"` |
| `className=(empty string)`| (initial)| `<empty string>` |
| `className=(array with string)`| (changed)| `"string"` |
| `className=(empty array)`| (initial)| `<empty string>` |
| `className=(object)`| (changed)| `"result of toString()"` |
| `className=(numeric string)`| (changed)| `"42"` |
| `className=(-1)`| (changed)| `"-1"` |
| `className=(0)`| (changed)| `"0"` |
| `className=(integer)`| (changed)| `"1"` |
| `className=(NaN)`| (changed, warning)| `"NaN"` |
| `className=(float)`| (changed)| `"99.99"` |
| `className=(true)`| (initial, warning)| `<empty string>` |
| `className=(false)`| (initial, warning)| `<empty string>` |
| `className=(string 'true')`| (changed)| `"true"` |
| `className=(string 'false')`| (changed)| `"false"` |
| `className=(string 'on')`| (changed)| `"on"` |
| `className=(string 'off')`| (changed)| `"off"` |
| `className=(symbol)`| (initial, warning)| `<empty string>` |
| `className=(function)`| (initial, warning)| `<empty string>` |
| `className=(null)`| (initial)| `<empty string>` |
| `className=(undefined)`| (initial)| `<empty string>` |

## `clip` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `clip=(string)`| (changed)| `"a string"` |
| `clip=(empty string)`| (changed)| `<empty string>` |
| `clip=(array with string)`| (changed)| `"string"` |
| `clip=(empty array)`| (changed)| `<empty string>` |
| `clip=(object)`| (changed)| `"result of toString()"` |
| `clip=(numeric string)`| (changed)| `"42"` |
| `clip=(-1)`| (changed)| `"-1"` |
| `clip=(0)`| (changed)| `"0"` |
| `clip=(integer)`| (changed)| `"1"` |
| `clip=(NaN)`| (changed, warning)| `"NaN"` |
| `clip=(float)`| (changed)| `"99.99"` |
| `clip=(true)`| (initial, warning)| `<null>` |
| `clip=(false)`| (initial, warning)| `<null>` |
| `clip=(string 'true')`| (changed)| `"true"` |
| `clip=(string 'false')`| (changed)| `"false"` |
| `clip=(string 'on')`| (changed)| `"on"` |
| `clip=(string 'off')`| (changed)| `"off"` |
| `clip=(symbol)`| (initial, warning)| `<null>` |
| `clip=(function)`| (initial, warning)| `<null>` |
| `clip=(null)`| (initial)| `<null>` |
| `clip=(undefined)`| (initial)| `<null>` |

## `clip-path` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `clip-path=(string)`| (changed, warning)| `"a string"` |
| `clip-path=(empty string)`| (changed, warning)| `<empty string>` |
| `clip-path=(array with string)`| (changed, warning)| `"string"` |
| `clip-path=(empty array)`| (changed, warning)| `<empty string>` |
| `clip-path=(object)`| (changed, warning)| `"result of toString()"` |
| `clip-path=(numeric string)`| (changed, warning)| `"42"` |
| `clip-path=(-1)`| (changed, warning)| `"-1"` |
| `clip-path=(0)`| (changed, warning)| `"0"` |
| `clip-path=(integer)`| (changed, warning)| `"1"` |
| `clip-path=(NaN)`| (changed, warning)| `"NaN"` |
| `clip-path=(float)`| (changed, warning)| `"99.99"` |
| `clip-path=(true)`| (initial, warning)| `<null>` |
| `clip-path=(false)`| (initial, warning)| `<null>` |
| `clip-path=(string 'true')`| (changed, warning)| `"true"` |
| `clip-path=(string 'false')`| (changed, warning)| `"false"` |
| `clip-path=(string 'on')`| (changed, warning)| `"on"` |
| `clip-path=(string 'off')`| (changed, warning)| `"off"` |
| `clip-path=(symbol)`| (initial, warning)| `<null>` |
| `clip-path=(function)`| (initial, warning)| `<null>` |
| `clip-path=(null)`| (initial, warning)| `<null>` |
| `clip-path=(undefined)`| (initial, warning)| `<null>` |

## `clipPath` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `clipPath=(string)`| (changed)| `"a string"` |
| `clipPath=(empty string)`| (changed)| `<empty string>` |
| `clipPath=(array with string)`| (changed)| `"string"` |
| `clipPath=(empty array)`| (changed)| `<empty string>` |
| `clipPath=(object)`| (changed)| `"result of toString()"` |
| `clipPath=(numeric string)`| (changed)| `"42"` |
| `clipPath=(-1)`| (changed)| `"-1"` |
| `clipPath=(0)`| (changed)| `"0"` |
| `clipPath=(integer)`| (changed)| `"1"` |
| `clipPath=(NaN)`| (changed, warning)| `"NaN"` |
| `clipPath=(float)`| (changed)| `"99.99"` |
| `clipPath=(true)`| (initial, warning)| `<null>` |
| `clipPath=(false)`| (initial, warning)| `<null>` |
| `clipPath=(string 'true')`| (changed)| `"true"` |
| `clipPath=(string 'false')`| (changed)| `"false"` |
| `clipPath=(string 'on')`| (changed)| `"on"` |
| `clipPath=(string 'off')`| (changed)| `"off"` |
| `clipPath=(symbol)`| (initial, warning)| `<null>` |
| `clipPath=(function)`| (initial, warning)| `<null>` |
| `clipPath=(null)`| (initial)| `<null>` |
| `clipPath=(undefined)`| (initial)| `<null>` |

## `clipPathUnits` (on `<clipPath>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `clipPathUnits=(string)`| (changed)| `<number: 2>` |
| `clipPathUnits=(empty string)`| (initial)| `<number: 1>` |
| `clipPathUnits=(array with string)`| (changed)| `<number: 2>` |
| `clipPathUnits=(empty array)`| (initial)| `<number: 1>` |
| `clipPathUnits=(object)`| (initial)| `<number: 1>` |
| `clipPathUnits=(numeric string)`| (initial)| `<number: 1>` |
| `clipPathUnits=(-1)`| (initial)| `<number: 1>` |
| `clipPathUnits=(0)`| (initial)| `<number: 1>` |
| `clipPathUnits=(integer)`| (initial)| `<number: 1>` |
| `clipPathUnits=(NaN)`| (initial, warning)| `<number: 1>` |
| `clipPathUnits=(float)`| (initial)| `<number: 1>` |
| `clipPathUnits=(true)`| (initial, warning)| `<number: 1>` |
| `clipPathUnits=(false)`| (initial, warning)| `<number: 1>` |
| `clipPathUnits=(string 'true')`| (initial)| `<number: 1>` |
| `clipPathUnits=(string 'false')`| (initial)| `<number: 1>` |
| `clipPathUnits=(string 'on')`| (initial)| `<number: 1>` |
| `clipPathUnits=(string 'off')`| (initial)| `<number: 1>` |
| `clipPathUnits=(symbol)`| (initial, warning)| `<number: 1>` |
| `clipPathUnits=(function)`| (initial, warning)| `<number: 1>` |
| `clipPathUnits=(null)`| (initial)| `<number: 1>` |
| `clipPathUnits=(undefined)`| (initial)| `<number: 1>` |

## `clip-rule` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `clip-rule=(string)`| (changed, warning)| `"a string"` |
| `clip-rule=(empty string)`| (changed, warning)| `<empty string>` |
| `clip-rule=(array with string)`| (changed, warning)| `"string"` |
| `clip-rule=(empty array)`| (changed, warning)| `<empty string>` |
| `clip-rule=(object)`| (changed, warning)| `"result of toString()"` |
| `clip-rule=(numeric string)`| (changed, warning)| `"42"` |
| `clip-rule=(-1)`| (changed, warning)| `"-1"` |
| `clip-rule=(0)`| (changed, warning)| `"0"` |
| `clip-rule=(integer)`| (changed, warning)| `"1"` |
| `clip-rule=(NaN)`| (changed, warning)| `"NaN"` |
| `clip-rule=(float)`| (changed, warning)| `"99.99"` |
| `clip-rule=(true)`| (initial, warning)| `<null>` |
| `clip-rule=(false)`| (initial, warning)| `<null>` |
| `clip-rule=(string 'true')`| (changed, warning)| `"true"` |
| `clip-rule=(string 'false')`| (changed, warning)| `"false"` |
| `clip-rule=(string 'on')`| (changed, warning)| `"on"` |
| `clip-rule=(string 'off')`| (changed, warning)| `"off"` |
| `clip-rule=(symbol)`| (initial, warning)| `<null>` |
| `clip-rule=(function)`| (initial, warning)| `<null>` |
| `clip-rule=(null)`| (initial, warning)| `<null>` |
| `clip-rule=(undefined)`| (initial, warning)| `<null>` |

## `clipRule` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `clipRule=(string)`| (changed)| `"a string"` |
| `clipRule=(empty string)`| (changed)| `<empty string>` |
| `clipRule=(array with string)`| (changed)| `"string"` |
| `clipRule=(empty array)`| (changed)| `<empty string>` |
| `clipRule=(object)`| (changed)| `"result of toString()"` |
| `clipRule=(numeric string)`| (changed)| `"42"` |
| `clipRule=(-1)`| (changed)| `"-1"` |
| `clipRule=(0)`| (changed)| `"0"` |
| `clipRule=(integer)`| (changed)| `"1"` |
| `clipRule=(NaN)`| (changed, warning)| `"NaN"` |
| `clipRule=(float)`| (changed)| `"99.99"` |
| `clipRule=(true)`| (initial, warning)| `<null>` |
| `clipRule=(false)`| (initial, warning)| `<null>` |
| `clipRule=(string 'true')`| (changed)| `"true"` |
| `clipRule=(string 'false')`| (changed)| `"false"` |
| `clipRule=(string 'on')`| (changed)| `"on"` |
| `clipRule=(string 'off')`| (changed)| `"off"` |
| `clipRule=(symbol)`| (initial, warning)| `<null>` |
| `clipRule=(function)`| (initial, warning)| `<null>` |
| `clipRule=(null)`| (initial)| `<null>` |
| `clipRule=(undefined)`| (initial)| `<null>` |

## `color` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `color=(string)`| (changed)| `"a string"` |
| `color=(empty string)`| (changed)| `<empty string>` |
| `color=(array with string)`| (changed)| `"string"` |
| `color=(empty array)`| (changed)| `<empty string>` |
| `color=(object)`| (changed)| `"result of toString()"` |
| `color=(numeric string)`| (changed)| `"42"` |
| `color=(-1)`| (changed)| `"-1"` |
| `color=(0)`| (changed)| `"0"` |
| `color=(integer)`| (changed)| `"1"` |
| `color=(NaN)`| (changed, warning)| `"NaN"` |
| `color=(float)`| (changed)| `"99.99"` |
| `color=(true)`| (initial, warning)| `<null>` |
| `color=(false)`| (initial, warning)| `<null>` |
| `color=(string 'true')`| (changed)| `"true"` |
| `color=(string 'false')`| (changed)| `"false"` |
| `color=(string 'on')`| (changed)| `"on"` |
| `color=(string 'off')`| (changed)| `"off"` |
| `color=(symbol)`| (initial, warning)| `<null>` |
| `color=(function)`| (initial, warning)| `<null>` |
| `color=(null)`| (initial)| `<null>` |
| `color=(undefined)`| (initial)| `<null>` |

## `color-interpolation` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `color-interpolation=(string)`| (changed, warning)| `"sRGB"` |
| `color-interpolation=(empty string)`| (changed, warning)| `<empty string>` |
| `color-interpolation=(array with string)`| (changed, warning)| `"sRGB"` |
| `color-interpolation=(empty array)`| (changed, warning)| `<empty string>` |
| `color-interpolation=(object)`| (changed, warning)| `"result of toString()"` |
| `color-interpolation=(numeric string)`| (changed, warning)| `"42"` |
| `color-interpolation=(-1)`| (changed, warning)| `"-1"` |
| `color-interpolation=(0)`| (changed, warning)| `"0"` |
| `color-interpolation=(integer)`| (changed, warning)| `"1"` |
| `color-interpolation=(NaN)`| (changed, warning)| `"NaN"` |
| `color-interpolation=(float)`| (changed, warning)| `"99.99"` |
| `color-interpolation=(true)`| (initial, warning)| `<null>` |
| `color-interpolation=(false)`| (initial, warning)| `<null>` |
| `color-interpolation=(string 'true')`| (changed, warning)| `"true"` |
| `color-interpolation=(string 'false')`| (changed, warning)| `"false"` |
| `color-interpolation=(string 'on')`| (changed, warning)| `"on"` |
| `color-interpolation=(string 'off')`| (changed, warning)| `"off"` |
| `color-interpolation=(symbol)`| (initial, warning)| `<null>` |
| `color-interpolation=(function)`| (initial, warning)| `<null>` |
| `color-interpolation=(null)`| (initial, warning)| `<null>` |
| `color-interpolation=(undefined)`| (initial, warning)| `<null>` |

## `colorInterpolation` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `colorInterpolation=(string)`| (changed)| `"sRGB"` |
| `colorInterpolation=(empty string)`| (changed)| `<empty string>` |
| `colorInterpolation=(array with string)`| (changed)| `"sRGB"` |
| `colorInterpolation=(empty array)`| (changed)| `<empty string>` |
| `colorInterpolation=(object)`| (changed)| `"result of toString()"` |
| `colorInterpolation=(numeric string)`| (changed)| `"42"` |
| `colorInterpolation=(-1)`| (changed)| `"-1"` |
| `colorInterpolation=(0)`| (changed)| `"0"` |
| `colorInterpolation=(integer)`| (changed)| `"1"` |
| `colorInterpolation=(NaN)`| (changed, warning)| `"NaN"` |
| `colorInterpolation=(float)`| (changed)| `"99.99"` |
| `colorInterpolation=(true)`| (initial, warning)| `<null>` |
| `colorInterpolation=(false)`| (initial, warning)| `<null>` |
| `colorInterpolation=(string 'true')`| (changed)| `"true"` |
| `colorInterpolation=(string 'false')`| (changed)| `"false"` |
| `colorInterpolation=(string 'on')`| (changed)| `"on"` |
| `colorInterpolation=(string 'off')`| (changed)| `"off"` |
| `colorInterpolation=(symbol)`| (initial, warning)| `<null>` |
| `colorInterpolation=(function)`| (initial, warning)| `<null>` |
| `colorInterpolation=(null)`| (initial)| `<null>` |
| `colorInterpolation=(undefined)`| (initial)| `<null>` |

## `color-interpolation-filters` (on `<feComposite>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `color-interpolation-filters=(string)`| (changed, warning)| `"sRGB"` |
| `color-interpolation-filters=(empty string)`| (changed, warning)| `<empty string>` |
| `color-interpolation-filters=(array with string)`| (changed, warning)| `"sRGB"` |
| `color-interpolation-filters=(empty array)`| (changed, warning)| `<empty string>` |
| `color-interpolation-filters=(object)`| (changed, warning)| `"result of toString()"` |
| `color-interpolation-filters=(numeric string)`| (changed, warning)| `"42"` |
| `color-interpolation-filters=(-1)`| (changed, warning)| `"-1"` |
| `color-interpolation-filters=(0)`| (changed, warning)| `"0"` |
| `color-interpolation-filters=(integer)`| (changed, warning)| `"1"` |
| `color-interpolation-filters=(NaN)`| (changed, warning)| `"NaN"` |
| `color-interpolation-filters=(float)`| (changed, warning)| `"99.99"` |
| `color-interpolation-filters=(true)`| (initial, warning)| `<null>` |
| `color-interpolation-filters=(false)`| (initial, warning)| `<null>` |
| `color-interpolation-filters=(string 'true')`| (changed, warning)| `"true"` |
| `color-interpolation-filters=(string 'false')`| (changed, warning)| `"false"` |
| `color-interpolation-filters=(string 'on')`| (changed, warning)| `"on"` |
| `color-interpolation-filters=(string 'off')`| (changed, warning)| `"off"` |
| `color-interpolation-filters=(symbol)`| (initial, warning)| `<null>` |
| `color-interpolation-filters=(function)`| (initial, warning)| `<null>` |
| `color-interpolation-filters=(null)`| (initial, warning)| `<null>` |
| `color-interpolation-filters=(undefined)`| (initial, warning)| `<null>` |

## `colorInterpolationFilters` (on `<feComposite>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `colorInterpolationFilters=(string)`| (changed)| `"sRGB"` |
| `colorInterpolationFilters=(empty string)`| (changed)| `<empty string>` |
| `colorInterpolationFilters=(array with string)`| (changed)| `"sRGB"` |
| `colorInterpolationFilters=(empty array)`| (changed)| `<empty string>` |
| `colorInterpolationFilters=(object)`| (changed)| `"result of toString()"` |
| `colorInterpolationFilters=(numeric string)`| (changed)| `"42"` |
| `colorInterpolationFilters=(-1)`| (changed)| `"-1"` |
| `colorInterpolationFilters=(0)`| (changed)| `"0"` |
| `colorInterpolationFilters=(integer)`| (changed)| `"1"` |
| `colorInterpolationFilters=(NaN)`| (changed, warning)| `"NaN"` |
| `colorInterpolationFilters=(float)`| (changed)| `"99.99"` |
| `colorInterpolationFilters=(true)`| (initial, warning)| `<null>` |
| `colorInterpolationFilters=(false)`| (initial, warning)| `<null>` |
| `colorInterpolationFilters=(string 'true')`| (changed)| `"true"` |
| `colorInterpolationFilters=(string 'false')`| (changed)| `"false"` |
| `colorInterpolationFilters=(string 'on')`| (changed)| `"on"` |
| `colorInterpolationFilters=(string 'off')`| (changed)| `"off"` |
| `colorInterpolationFilters=(symbol)`| (initial, warning)| `<null>` |
| `colorInterpolationFilters=(function)`| (initial, warning)| `<null>` |
| `colorInterpolationFilters=(null)`| (initial)| `<null>` |
| `colorInterpolationFilters=(undefined)`| (initial)| `<null>` |

## `color-profile` (on `<image>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `color-profile=(string)`| (changed, warning)| `"sRGB"` |
| `color-profile=(empty string)`| (changed, warning)| `<empty string>` |
| `color-profile=(array with string)`| (changed, warning)| `"sRGB"` |
| `color-profile=(empty array)`| (changed, warning)| `<empty string>` |
| `color-profile=(object)`| (changed, warning)| `"result of toString()"` |
| `color-profile=(numeric string)`| (changed, warning)| `"42"` |
| `color-profile=(-1)`| (changed, warning)| `"-1"` |
| `color-profile=(0)`| (changed, warning)| `"0"` |
| `color-profile=(integer)`| (changed, warning)| `"1"` |
| `color-profile=(NaN)`| (changed, warning)| `"NaN"` |
| `color-profile=(float)`| (changed, warning)| `"99.99"` |
| `color-profile=(true)`| (initial, warning)| `<null>` |
| `color-profile=(false)`| (initial, warning)| `<null>` |
| `color-profile=(string 'true')`| (changed, warning)| `"true"` |
| `color-profile=(string 'false')`| (changed, warning)| `"false"` |
| `color-profile=(string 'on')`| (changed, warning)| `"on"` |
| `color-profile=(string 'off')`| (changed, warning)| `"off"` |
| `color-profile=(symbol)`| (initial, warning)| `<null>` |
| `color-profile=(function)`| (initial, warning)| `<null>` |
| `color-profile=(null)`| (initial, warning)| `<null>` |
| `color-profile=(undefined)`| (initial, warning)| `<null>` |

## `colorProfile` (on `<image>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `colorProfile=(string)`| (changed)| `"sRGB"` |
| `colorProfile=(empty string)`| (changed)| `<empty string>` |
| `colorProfile=(array with string)`| (changed)| `"sRGB"` |
| `colorProfile=(empty array)`| (changed)| `<empty string>` |
| `colorProfile=(object)`| (changed)| `"result of toString()"` |
| `colorProfile=(numeric string)`| (changed)| `"42"` |
| `colorProfile=(-1)`| (changed)| `"-1"` |
| `colorProfile=(0)`| (changed)| `"0"` |
| `colorProfile=(integer)`| (changed)| `"1"` |
| `colorProfile=(NaN)`| (changed, warning)| `"NaN"` |
| `colorProfile=(float)`| (changed)| `"99.99"` |
| `colorProfile=(true)`| (initial, warning)| `<null>` |
| `colorProfile=(false)`| (initial, warning)| `<null>` |
| `colorProfile=(string 'true')`| (changed)| `"true"` |
| `colorProfile=(string 'false')`| (changed)| `"false"` |
| `colorProfile=(string 'on')`| (changed)| `"on"` |
| `colorProfile=(string 'off')`| (changed)| `"off"` |
| `colorProfile=(symbol)`| (initial, warning)| `<null>` |
| `colorProfile=(function)`| (initial, warning)| `<null>` |
| `colorProfile=(null)`| (initial)| `<null>` |
| `colorProfile=(undefined)`| (initial)| `<null>` |

## `color-rendering` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `color-rendering=(string)`| (changed, warning)| `"optimizeSpeed"` |
| `color-rendering=(empty string)`| (changed, warning)| `<empty string>` |
| `color-rendering=(array with string)`| (changed, warning)| `"optimizeSpeed"` |
| `color-rendering=(empty array)`| (changed, warning)| `<empty string>` |
| `color-rendering=(object)`| (changed, warning)| `"result of toString()"` |
| `color-rendering=(numeric string)`| (changed, warning)| `"42"` |
| `color-rendering=(-1)`| (changed, warning)| `"-1"` |
| `color-rendering=(0)`| (changed, warning)| `"0"` |
| `color-rendering=(integer)`| (changed, warning)| `"1"` |
| `color-rendering=(NaN)`| (changed, warning)| `"NaN"` |
| `color-rendering=(float)`| (changed, warning)| `"99.99"` |
| `color-rendering=(true)`| (initial, warning)| `<null>` |
| `color-rendering=(false)`| (initial, warning)| `<null>` |
| `color-rendering=(string 'true')`| (changed, warning)| `"true"` |
| `color-rendering=(string 'false')`| (changed, warning)| `"false"` |
| `color-rendering=(string 'on')`| (changed, warning)| `"on"` |
| `color-rendering=(string 'off')`| (changed, warning)| `"off"` |
| `color-rendering=(symbol)`| (initial, warning)| `<null>` |
| `color-rendering=(function)`| (initial, warning)| `<null>` |
| `color-rendering=(null)`| (initial, warning)| `<null>` |
| `color-rendering=(undefined)`| (initial, warning)| `<null>` |

## `colorRendering` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `colorRendering=(string)`| (changed)| `"optimizeSpeed"` |
| `colorRendering=(empty string)`| (changed)| `<empty string>` |
| `colorRendering=(array with string)`| (changed)| `"optimizeSpeed"` |
| `colorRendering=(empty array)`| (changed)| `<empty string>` |
| `colorRendering=(object)`| (changed)| `"result of toString()"` |
| `colorRendering=(numeric string)`| (changed)| `"42"` |
| `colorRendering=(-1)`| (changed)| `"-1"` |
| `colorRendering=(0)`| (changed)| `"0"` |
| `colorRendering=(integer)`| (changed)| `"1"` |
| `colorRendering=(NaN)`| (changed, warning)| `"NaN"` |
| `colorRendering=(float)`| (changed)| `"99.99"` |
| `colorRendering=(true)`| (initial, warning)| `<null>` |
| `colorRendering=(false)`| (initial, warning)| `<null>` |
| `colorRendering=(string 'true')`| (changed)| `"true"` |
| `colorRendering=(string 'false')`| (changed)| `"false"` |
| `colorRendering=(string 'on')`| (changed)| `"on"` |
| `colorRendering=(string 'off')`| (changed)| `"off"` |
| `colorRendering=(symbol)`| (initial, warning)| `<null>` |
| `colorRendering=(function)`| (initial, warning)| `<null>` |
| `colorRendering=(null)`| (initial)| `<null>` |
| `colorRendering=(undefined)`| (initial)| `<null>` |

## `cols` (on `<textarea>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `cols=(string)`| (initial)| `<number: 20>` |
| `cols=(empty string)`| (initial)| `<number: 20>` |
| `cols=(array with string)`| (initial)| `<number: 20>` |
| `cols=(empty array)`| (initial)| `<number: 20>` |
| `cols=(object)`| (initial)| `<number: 20>` |
| `cols=(numeric string)`| (changed)| `<number: 42>` |
| `cols=(-1)`| (initial)| `<number: 20>` |
| `cols=(0)`| (initial)| `<number: 20>` |
| `cols=(integer)`| (changed)| `<number: 1>` |
| `cols=(NaN)`| (initial, warning)| `<number: 20>` |
| `cols=(float)`| (changed)| `<number: 99>` |
| `cols=(true)`| (initial, warning)| `<number: 20>` |
| `cols=(false)`| (initial, warning)| `<number: 20>` |
| `cols=(string 'true')`| (initial)| `<number: 20>` |
| `cols=(string 'false')`| (initial)| `<number: 20>` |
| `cols=(string 'on')`| (initial)| `<number: 20>` |
| `cols=(string 'off')`| (initial)| `<number: 20>` |
| `cols=(symbol)`| (initial, warning)| `<number: 20>` |
| `cols=(function)`| (initial, warning)| `<number: 20>` |
| `cols=(null)`| (initial)| `<number: 20>` |
| `cols=(undefined)`| (initial)| `<number: 20>` |

## `colSpan` (on `<td>` inside `<tr>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `colSpan=(string)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(empty string)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(array with string)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(empty array)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(object)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(numeric string)`| (changed, ssr error, ssr mismatch)| `<number: 42>` |
| `colSpan=(-1)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(0)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(integer)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(NaN)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(float)`| (changed, ssr error, ssr mismatch)| `<number: 99>` |
| `colSpan=(true)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(false)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(string 'true')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(string 'false')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(string 'on')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(string 'off')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(symbol)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(function)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(null)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `colSpan=(undefined)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |

## `content` (on `<meta>` inside `<head>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `content=(string)`| (changed)| `"a string"` |
| `content=(empty string)`| (initial)| `<empty string>` |
| `content=(array with string)`| (changed)| `"string"` |
| `content=(empty array)`| (initial)| `<empty string>` |
| `content=(object)`| (changed)| `"result of toString()"` |
| `content=(numeric string)`| (changed)| `"42"` |
| `content=(-1)`| (changed)| `"-1"` |
| `content=(0)`| (changed)| `"0"` |
| `content=(integer)`| (changed)| `"1"` |
| `content=(NaN)`| (changed, warning)| `"NaN"` |
| `content=(float)`| (changed)| `"99.99"` |
| `content=(true)`| (initial, warning)| `<empty string>` |
| `content=(false)`| (initial, warning)| `<empty string>` |
| `content=(string 'true')`| (changed)| `"true"` |
| `content=(string 'false')`| (changed)| `"false"` |
| `content=(string 'on')`| (changed)| `"on"` |
| `content=(string 'off')`| (changed)| `"off"` |
| `content=(symbol)`| (initial, warning)| `<empty string>` |
| `content=(function)`| (initial, warning)| `<empty string>` |
| `content=(null)`| (initial)| `<empty string>` |
| `content=(undefined)`| (initial)| `<empty string>` |

## `contentEditable` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `contentEditable=(string)`| (initial)| `"inherit"` |
| `contentEditable=(empty string)`| (changed)| `"true"` |
| `contentEditable=(array with string)`| (initial)| `"inherit"` |
| `contentEditable=(empty array)`| (changed)| `"true"` |
| `contentEditable=(object)`| (initial)| `"inherit"` |
| `contentEditable=(numeric string)`| (initial)| `"inherit"` |
| `contentEditable=(-1)`| (initial)| `"inherit"` |
| `contentEditable=(0)`| (initial)| `"inherit"` |
| `contentEditable=(integer)`| (initial)| `"inherit"` |
| `contentEditable=(NaN)`| (initial, warning)| `"inherit"` |
| `contentEditable=(float)`| (initial)| `"inherit"` |
| `contentEditable=(true)`| (changed)| `"true"` |
| `contentEditable=(false)`| (changed)| `"false"` |
| `contentEditable=(string 'true')`| (changed)| `"true"` |
| `contentEditable=(string 'false')`| (changed)| `"false"` |
| `contentEditable=(string 'on')`| (initial)| `"inherit"` |
| `contentEditable=(string 'off')`| (initial)| `"inherit"` |
| `contentEditable=(symbol)`| (initial, warning)| `"inherit"` |
| `contentEditable=(function)`| (initial, warning)| `"inherit"` |
| `contentEditable=(null)`| (initial)| `"inherit"` |
| `contentEditable=(undefined)`| (initial)| `"inherit"` |

## `contentScriptType` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `contentScriptType=(string)`| (changed, ssr mismatch)| `"a string"` |
| `contentScriptType=(empty string)`| (changed, ssr mismatch)| `<empty string>` |
| `contentScriptType=(array with string)`| (changed, ssr mismatch)| `"string"` |
| `contentScriptType=(empty array)`| (changed, ssr mismatch)| `<empty string>` |
| `contentScriptType=(object)`| (changed, ssr mismatch)| `"result of toString()"` |
| `contentScriptType=(numeric string)`| (changed, ssr mismatch)| `"42"` |
| `contentScriptType=(-1)`| (changed, ssr mismatch)| `"-1"` |
| `contentScriptType=(0)`| (changed, ssr mismatch)| `"0"` |
| `contentScriptType=(integer)`| (changed, ssr mismatch)| `"1"` |
| `contentScriptType=(NaN)`| (changed, warning, ssr mismatch)| `"NaN"` |
| `contentScriptType=(float)`| (changed, ssr mismatch)| `"99.99"` |
| `contentScriptType=(true)`| (initial, warning)| `<null>` |
| `contentScriptType=(false)`| (initial, warning)| `<null>` |
| `contentScriptType=(string 'true')`| (changed, ssr mismatch)| `"true"` |
| `contentScriptType=(string 'false')`| (changed, ssr mismatch)| `"false"` |
| `contentScriptType=(string 'on')`| (changed, ssr mismatch)| `"on"` |
| `contentScriptType=(string 'off')`| (changed, ssr mismatch)| `"off"` |
| `contentScriptType=(symbol)`| (initial, warning)| `<null>` |
| `contentScriptType=(function)`| (initial, warning)| `<null>` |
| `contentScriptType=(null)`| (initial)| `<null>` |
| `contentScriptType=(undefined)`| (initial)| `<null>` |

## `contentStyleType` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `contentStyleType=(string)`| (changed, ssr mismatch)| `"a string"` |
| `contentStyleType=(empty string)`| (changed, ssr mismatch)| `<empty string>` |
| `contentStyleType=(array with string)`| (changed, ssr mismatch)| `"string"` |
| `contentStyleType=(empty array)`| (changed, ssr mismatch)| `<empty string>` |
| `contentStyleType=(object)`| (changed, ssr mismatch)| `"result of toString()"` |
| `contentStyleType=(numeric string)`| (changed, ssr mismatch)| `"42"` |
| `contentStyleType=(-1)`| (changed, ssr mismatch)| `"-1"` |
| `contentStyleType=(0)`| (changed, ssr mismatch)| `"0"` |
| `contentStyleType=(integer)`| (changed, ssr mismatch)| `"1"` |
| `contentStyleType=(NaN)`| (changed, warning, ssr mismatch)| `"NaN"` |
| `contentStyleType=(float)`| (changed, ssr mismatch)| `"99.99"` |
| `contentStyleType=(true)`| (initial, warning)| `<null>` |
| `contentStyleType=(false)`| (initial, warning)| `<null>` |
| `contentStyleType=(string 'true')`| (changed, ssr mismatch)| `"true"` |
| `contentStyleType=(string 'false')`| (changed, ssr mismatch)| `"false"` |
| `contentStyleType=(string 'on')`| (changed, ssr mismatch)| `"on"` |
| `contentStyleType=(string 'off')`| (changed, ssr mismatch)| `"off"` |
| `contentStyleType=(symbol)`| (initial, warning)| `<null>` |
| `contentStyleType=(function)`| (initial, warning)| `<null>` |
| `contentStyleType=(null)`| (initial)| `<null>` |
| `contentStyleType=(undefined)`| (initial)| `<null>` |

## `contextMenu` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `contextMenu=(string)`| (changed)| `"a string"` |
| `contextMenu=(empty string)`| (changed)| `<empty string>` |
| `contextMenu=(array with string)`| (changed)| `"string"` |
| `contextMenu=(empty array)`| (changed)| `<empty string>` |
| `contextMenu=(object)`| (changed)| `"result of toString()"` |
| `contextMenu=(numeric string)`| (changed)| `"42"` |
| `contextMenu=(-1)`| (changed)| `"-1"` |
| `contextMenu=(0)`| (changed)| `"0"` |
| `contextMenu=(integer)`| (changed)| `"1"` |
| `contextMenu=(NaN)`| (changed, warning)| `"NaN"` |
| `contextMenu=(float)`| (changed)| `"99.99"` |
| `contextMenu=(true)`| (initial, warning)| `<null>` |
| `contextMenu=(false)`| (initial, warning)| `<null>` |
| `contextMenu=(string 'true')`| (changed)| `"true"` |
| `contextMenu=(string 'false')`| (changed)| `"false"` |
| `contextMenu=(string 'on')`| (changed)| `"on"` |
| `contextMenu=(string 'off')`| (changed)| `"off"` |
| `contextMenu=(symbol)`| (initial, warning)| `<null>` |
| `contextMenu=(function)`| (initial, warning)| `<null>` |
| `contextMenu=(null)`| (initial)| `<null>` |
| `contextMenu=(undefined)`| (initial)| `<null>` |

## `controls` (on `<video>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `controls=(string)`| (changed)| `<boolean: true>` |
| `controls=(empty string)`| (initial)| `<boolean: false>` |
| `controls=(array with string)`| (changed)| `<boolean: true>` |
| `controls=(empty array)`| (changed)| `<boolean: true>` |
| `controls=(object)`| (changed)| `<boolean: true>` |
| `controls=(numeric string)`| (changed)| `<boolean: true>` |
| `controls=(-1)`| (changed)| `<boolean: true>` |
| `controls=(0)`| (initial)| `<boolean: false>` |
| `controls=(integer)`| (changed)| `<boolean: true>` |
| `controls=(NaN)`| (initial, warning)| `<boolean: false>` |
| `controls=(float)`| (changed)| `<boolean: true>` |
| `controls=(true)`| (changed)| `<boolean: true>` |
| `controls=(false)`| (initial)| `<boolean: false>` |
| `controls=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `controls=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `controls=(string 'on')`| (changed)| `<boolean: true>` |
| `controls=(string 'off')`| (changed)| `<boolean: true>` |
| `controls=(symbol)`| (initial, warning)| `<boolean: false>` |
| `controls=(function)`| (initial, warning)| `<boolean: false>` |
| `controls=(null)`| (initial)| `<boolean: false>` |
| `controls=(undefined)`| (initial)| `<boolean: false>` |

## `coords` (on `<a>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `coords=(string)`| (changed)| `"a string"` |
| `coords=(empty string)`| (initial)| `<empty string>` |
| `coords=(array with string)`| (changed)| `"string"` |
| `coords=(empty array)`| (initial)| `<empty string>` |
| `coords=(object)`| (changed)| `"result of toString()"` |
| `coords=(numeric string)`| (changed)| `"42"` |
| `coords=(-1)`| (changed)| `"-1"` |
| `coords=(0)`| (changed)| `"0"` |
| `coords=(integer)`| (changed)| `"1"` |
| `coords=(NaN)`| (changed, warning)| `"NaN"` |
| `coords=(float)`| (changed)| `"99.99"` |
| `coords=(true)`| (initial, warning)| `<empty string>` |
| `coords=(false)`| (initial, warning)| `<empty string>` |
| `coords=(string 'true')`| (changed)| `"true"` |
| `coords=(string 'false')`| (changed)| `"false"` |
| `coords=(string 'on')`| (changed)| `"on"` |
| `coords=(string 'off')`| (changed)| `"off"` |
| `coords=(symbol)`| (initial, warning)| `<empty string>` |
| `coords=(function)`| (initial, warning)| `<empty string>` |
| `coords=(null)`| (initial)| `<empty string>` |
| `coords=(undefined)`| (initial)| `<empty string>` |

## `crossOrigin` (on `<script>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `crossOrigin=(string)`| (changed)| `"anonymous"` |
| `crossOrigin=(empty string)`| (changed)| `"anonymous"` |
| `crossOrigin=(array with string)`| (changed)| `"anonymous"` |
| `crossOrigin=(empty array)`| (changed)| `"anonymous"` |
| `crossOrigin=(object)`| (changed)| `"anonymous"` |
| `crossOrigin=(numeric string)`| (changed)| `"anonymous"` |
| `crossOrigin=(-1)`| (changed)| `"anonymous"` |
| `crossOrigin=(0)`| (changed)| `"anonymous"` |
| `crossOrigin=(integer)`| (changed)| `"anonymous"` |
| `crossOrigin=(NaN)`| (changed, warning)| `"anonymous"` |
| `crossOrigin=(float)`| (changed)| `"anonymous"` |
| `crossOrigin=(true)`| (initial, warning)| `<null>` |
| `crossOrigin=(false)`| (initial, warning)| `<null>` |
| `crossOrigin=(string 'true')`| (changed)| `"anonymous"` |
| `crossOrigin=(string 'false')`| (changed)| `"anonymous"` |
| `crossOrigin=(string 'on')`| (changed)| `"anonymous"` |
| `crossOrigin=(string 'off')`| (changed)| `"anonymous"` |
| `crossOrigin=(symbol)`| (initial, warning)| `<null>` |
| `crossOrigin=(function)`| (initial, warning)| `<null>` |
| `crossOrigin=(null)`| (initial)| `<null>` |
| `crossOrigin=(undefined)`| (initial)| `<null>` |

## `cursor` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `cursor=(string)`| (changed)| `"a string"` |
| `cursor=(empty string)`| (changed)| `<empty string>` |
| `cursor=(array with string)`| (changed)| `"string"` |
| `cursor=(empty array)`| (changed)| `<empty string>` |
| `cursor=(object)`| (changed)| `"result of toString()"` |
| `cursor=(numeric string)`| (changed)| `"42"` |
| `cursor=(-1)`| (changed)| `"-1"` |
| `cursor=(0)`| (changed)| `"0"` |
| `cursor=(integer)`| (changed)| `"1"` |
| `cursor=(NaN)`| (changed, warning)| `"NaN"` |
| `cursor=(float)`| (changed)| `"99.99"` |
| `cursor=(true)`| (initial, warning)| `<null>` |
| `cursor=(false)`| (initial, warning)| `<null>` |
| `cursor=(string 'true')`| (changed)| `"true"` |
| `cursor=(string 'false')`| (changed)| `"false"` |
| `cursor=(string 'on')`| (changed)| `"on"` |
| `cursor=(string 'off')`| (changed)| `"off"` |
| `cursor=(symbol)`| (initial, warning)| `<null>` |
| `cursor=(function)`| (initial, warning)| `<null>` |
| `cursor=(null)`| (initial)| `<null>` |
| `cursor=(undefined)`| (initial)| `<null>` |

## `cx` (on `<circle>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `cx=(string)`| (changed)| `<SVGLength: 10px>` |
| `cx=(empty string)`| (initial)| `<SVGLength: 0>` |
| `cx=(array with string)`| (changed)| `<SVGLength: 10px>` |
| `cx=(empty array)`| (initial)| `<SVGLength: 0>` |
| `cx=(object)`| (initial)| `<SVGLength: 0>` |
| `cx=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `cx=(-1)`| (changed)| `<SVGLength: -1>` |
| `cx=(0)`| (initial)| `<SVGLength: 0>` |
| `cx=(integer)`| (changed)| `<SVGLength: 1>` |
| `cx=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `cx=(float)`| (changed)| `<SVGLength: 99.99>` |
| `cx=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `cx=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `cx=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `cx=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `cx=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `cx=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `cx=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `cx=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `cx=(null)`| (initial)| `<SVGLength: 0>` |
| `cx=(undefined)`| (initial)| `<SVGLength: 0>` |

## `cy` (on `<circle>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `cy=(string)`| (changed)| `<SVGLength: 10%>` |
| `cy=(empty string)`| (initial)| `<SVGLength: 0>` |
| `cy=(array with string)`| (changed)| `<SVGLength: 10%>` |
| `cy=(empty array)`| (initial)| `<SVGLength: 0>` |
| `cy=(object)`| (initial)| `<SVGLength: 0>` |
| `cy=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `cy=(-1)`| (changed)| `<SVGLength: -1>` |
| `cy=(0)`| (initial)| `<SVGLength: 0>` |
| `cy=(integer)`| (changed)| `<SVGLength: 1>` |
| `cy=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `cy=(float)`| (changed)| `<SVGLength: 99.99>` |
| `cy=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `cy=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `cy=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `cy=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `cy=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `cy=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `cy=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `cy=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `cy=(null)`| (initial)| `<SVGLength: 0>` |
| `cy=(undefined)`| (initial)| `<SVGLength: 0>` |

## `d` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `d=(string)`| (changed)| `"a string"` |
| `d=(empty string)`| (changed)| `<empty string>` |
| `d=(array with string)`| (changed)| `"string"` |
| `d=(empty array)`| (changed)| `<empty string>` |
| `d=(object)`| (changed)| `"result of toString()"` |
| `d=(numeric string)`| (changed)| `"42"` |
| `d=(-1)`| (changed)| `"-1"` |
| `d=(0)`| (changed)| `"0"` |
| `d=(integer)`| (changed)| `"1"` |
| `d=(NaN)`| (changed, warning)| `"NaN"` |
| `d=(float)`| (changed)| `"99.99"` |
| `d=(true)`| (initial, warning)| `<null>` |
| `d=(false)`| (initial, warning)| `<null>` |
| `d=(string 'true')`| (changed)| `"true"` |
| `d=(string 'false')`| (changed)| `"false"` |
| `d=(string 'on')`| (changed)| `"on"` |
| `d=(string 'off')`| (changed)| `"off"` |
| `d=(symbol)`| (initial, warning)| `<null>` |
| `d=(function)`| (initial, warning)| `<null>` |
| `d=(null)`| (initial)| `<null>` |
| `d=(undefined)`| (initial)| `<null>` |

## `dangerouslySetInnerHTML` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `dangerouslySetInnerHTML=(string)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(empty string)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(array with string)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(empty array)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(object)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(numeric string)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(-1)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(0)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(integer)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(NaN)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(float)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(true)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(false)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(string 'true')`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(string 'false')`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(string 'on')`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(string 'off')`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(symbol)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(function)`| (changed, error, warning, ssr error)| `` |
| `dangerouslySetInnerHTML=(null)`| (initial)| `<null>` |
| `dangerouslySetInnerHTML=(undefined)`| (initial)| `<null>` |

## `DangerouslySetInnerHTML` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `DangerouslySetInnerHTML=(string)`| (changed, warning)| `"a string"` |
| `DangerouslySetInnerHTML=(empty string)`| (changed, warning)| `<empty string>` |
| `DangerouslySetInnerHTML=(array with string)`| (changed, warning)| `"string"` |
| `DangerouslySetInnerHTML=(empty array)`| (changed, warning)| `<empty string>` |
| `DangerouslySetInnerHTML=(object)`| (changed, warning)| `"result of toString()"` |
| `DangerouslySetInnerHTML=(numeric string)`| (changed, warning)| `"42"` |
| `DangerouslySetInnerHTML=(-1)`| (changed, warning)| `"-1"` |
| `DangerouslySetInnerHTML=(0)`| (changed, warning)| `"0"` |
| `DangerouslySetInnerHTML=(integer)`| (changed, warning)| `"1"` |
| `DangerouslySetInnerHTML=(NaN)`| (changed, warning)| `"NaN"` |
| `DangerouslySetInnerHTML=(float)`| (changed, warning)| `"99.99"` |
| `DangerouslySetInnerHTML=(true)`| (initial, warning)| `<null>` |
| `DangerouslySetInnerHTML=(false)`| (initial, warning)| `<null>` |
| `DangerouslySetInnerHTML=(string 'true')`| (changed, warning)| `"true"` |
| `DangerouslySetInnerHTML=(string 'false')`| (changed, warning)| `"false"` |
| `DangerouslySetInnerHTML=(string 'on')`| (changed, warning)| `"on"` |
| `DangerouslySetInnerHTML=(string 'off')`| (changed, warning)| `"off"` |
| `DangerouslySetInnerHTML=(symbol)`| (initial, warning)| `<null>` |
| `DangerouslySetInnerHTML=(function)`| (initial, warning)| `<null>` |
| `DangerouslySetInnerHTML=(null)`| (initial, warning)| `<null>` |
| `DangerouslySetInnerHTML=(undefined)`| (initial, warning)| `<null>` |

## `data` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `data=(string)`| (changed)| `"a string"` |
| `data=(empty string)`| (changed)| `<empty string>` |
| `data=(array with string)`| (changed)| `"string"` |
| `data=(empty array)`| (changed)| `<empty string>` |
| `data=(object)`| (changed)| `"result of toString()"` |
| `data=(numeric string)`| (changed)| `"42"` |
| `data=(-1)`| (changed)| `"-1"` |
| `data=(0)`| (changed)| `"0"` |
| `data=(integer)`| (changed)| `"1"` |
| `data=(NaN)`| (changed, warning)| `"NaN"` |
| `data=(float)`| (changed)| `"99.99"` |
| `data=(true)`| (initial, warning)| `<null>` |
| `data=(false)`| (initial, warning)| `<null>` |
| `data=(string 'true')`| (changed)| `"true"` |
| `data=(string 'false')`| (changed)| `"false"` |
| `data=(string 'on')`| (changed)| `"on"` |
| `data=(string 'off')`| (changed)| `"off"` |
| `data=(symbol)`| (initial, warning)| `<null>` |
| `data=(function)`| (initial, warning)| `<null>` |
| `data=(null)`| (initial)| `<null>` |
| `data=(undefined)`| (initial)| `<null>` |

## `data-` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `data-=(string)`| (changed)| `"a string"` |
| `data-=(empty string)`| (changed)| `<empty string>` |
| `data-=(array with string)`| (changed)| `"string"` |
| `data-=(empty array)`| (changed)| `<empty string>` |
| `data-=(object)`| (changed)| `"result of toString()"` |
| `data-=(numeric string)`| (changed)| `"42"` |
| `data-=(-1)`| (changed)| `"-1"` |
| `data-=(0)`| (changed)| `"0"` |
| `data-=(integer)`| (changed)| `"1"` |
| `data-=(NaN)`| (changed, warning)| `"NaN"` |
| `data-=(float)`| (changed)| `"99.99"` |
| `data-=(true)`| (changed)| `"true"` |
| `data-=(false)`| (changed)| `"false"` |
| `data-=(string 'true')`| (changed)| `"true"` |
| `data-=(string 'false')`| (changed)| `"false"` |
| `data-=(string 'on')`| (changed)| `"on"` |
| `data-=(string 'off')`| (changed)| `"off"` |
| `data-=(symbol)`| (initial, warning)| `<null>` |
| `data-=(function)`| (initial, warning)| `<null>` |
| `data-=(null)`| (initial)| `<null>` |
| `data-=(undefined)`| (initial)| `<null>` |

## `data-unknownattribute` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `data-unknownattribute=(string)`| (changed)| `"a string"` |
| `data-unknownattribute=(empty string)`| (changed)| `<empty string>` |
| `data-unknownattribute=(array with string)`| (changed)| `"string"` |
| `data-unknownattribute=(empty array)`| (changed)| `<empty string>` |
| `data-unknownattribute=(object)`| (changed)| `"result of toString()"` |
| `data-unknownattribute=(numeric string)`| (changed)| `"42"` |
| `data-unknownattribute=(-1)`| (changed)| `"-1"` |
| `data-unknownattribute=(0)`| (changed)| `"0"` |
| `data-unknownattribute=(integer)`| (changed)| `"1"` |
| `data-unknownattribute=(NaN)`| (changed, warning)| `"NaN"` |
| `data-unknownattribute=(float)`| (changed)| `"99.99"` |
| `data-unknownattribute=(true)`| (changed)| `"true"` |
| `data-unknownattribute=(false)`| (changed)| `"false"` |
| `data-unknownattribute=(string 'true')`| (changed)| `"true"` |
| `data-unknownattribute=(string 'false')`| (changed)| `"false"` |
| `data-unknownattribute=(string 'on')`| (changed)| `"on"` |
| `data-unknownattribute=(string 'off')`| (changed)| `"off"` |
| `data-unknownattribute=(symbol)`| (initial, warning)| `<null>` |
| `data-unknownattribute=(function)`| (initial, warning)| `<null>` |
| `data-unknownattribute=(null)`| (initial)| `<null>` |
| `data-unknownattribute=(undefined)`| (initial)| `<null>` |

## `datatype` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `datatype=(string)`| (changed)| `"a string"` |
| `datatype=(empty string)`| (changed)| `<empty string>` |
| `datatype=(array with string)`| (changed)| `"string"` |
| `datatype=(empty array)`| (changed)| `<empty string>` |
| `datatype=(object)`| (changed)| `"result of toString()"` |
| `datatype=(numeric string)`| (changed)| `"42"` |
| `datatype=(-1)`| (changed)| `"-1"` |
| `datatype=(0)`| (changed)| `"0"` |
| `datatype=(integer)`| (changed)| `"1"` |
| `datatype=(NaN)`| (changed, warning)| `"NaN"` |
| `datatype=(float)`| (changed)| `"99.99"` |
| `datatype=(true)`| (initial, warning)| `<null>` |
| `datatype=(false)`| (initial, warning)| `<null>` |
| `datatype=(string 'true')`| (changed)| `"true"` |
| `datatype=(string 'false')`| (changed)| `"false"` |
| `datatype=(string 'on')`| (changed)| `"on"` |
| `datatype=(string 'off')`| (changed)| `"off"` |
| `datatype=(symbol)`| (initial, warning)| `<null>` |
| `datatype=(function)`| (initial, warning)| `<null>` |
| `datatype=(null)`| (initial)| `<null>` |
| `datatype=(undefined)`| (initial)| `<null>` |

## `dateTime` (on `<time>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `dateTime=(string)`| (changed)| `"2001-05-15T19:00"` |
| `dateTime=(empty string)`| (changed)| `<empty string>` |
| `dateTime=(array with string)`| (changed)| `"2001-05-15T19:00"` |
| `dateTime=(empty array)`| (changed)| `<empty string>` |
| `dateTime=(object)`| (changed)| `"result of toString()"` |
| `dateTime=(numeric string)`| (changed)| `"42"` |
| `dateTime=(-1)`| (changed)| `"-1"` |
| `dateTime=(0)`| (changed)| `"0"` |
| `dateTime=(integer)`| (changed)| `"1"` |
| `dateTime=(NaN)`| (changed, warning)| `"NaN"` |
| `dateTime=(float)`| (changed)| `"99.99"` |
| `dateTime=(true)`| (initial, warning)| `<null>` |
| `dateTime=(false)`| (initial, warning)| `<null>` |
| `dateTime=(string 'true')`| (changed)| `"true"` |
| `dateTime=(string 'false')`| (changed)| `"false"` |
| `dateTime=(string 'on')`| (changed)| `"on"` |
| `dateTime=(string 'off')`| (changed)| `"off"` |
| `dateTime=(symbol)`| (initial, warning)| `<null>` |
| `dateTime=(function)`| (initial, warning)| `<null>` |
| `dateTime=(null)`| (initial)| `<null>` |
| `dateTime=(undefined)`| (initial)| `<null>` |

## `decelerate` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `decelerate=(string)`| (changed)| `"a string"` |
| `decelerate=(empty string)`| (changed)| `<empty string>` |
| `decelerate=(array with string)`| (changed)| `"string"` |
| `decelerate=(empty array)`| (changed)| `<empty string>` |
| `decelerate=(object)`| (changed)| `"result of toString()"` |
| `decelerate=(numeric string)`| (changed)| `"42"` |
| `decelerate=(-1)`| (changed)| `"-1"` |
| `decelerate=(0)`| (changed)| `"0"` |
| `decelerate=(integer)`| (changed)| `"1"` |
| `decelerate=(NaN)`| (changed, warning)| `"NaN"` |
| `decelerate=(float)`| (changed)| `"99.99"` |
| `decelerate=(true)`| (initial, warning)| `<null>` |
| `decelerate=(false)`| (initial, warning)| `<null>` |
| `decelerate=(string 'true')`| (changed)| `"true"` |
| `decelerate=(string 'false')`| (changed)| `"false"` |
| `decelerate=(string 'on')`| (changed)| `"on"` |
| `decelerate=(string 'off')`| (changed)| `"off"` |
| `decelerate=(symbol)`| (initial, warning)| `<null>` |
| `decelerate=(function)`| (initial, warning)| `<null>` |
| `decelerate=(null)`| (initial)| `<null>` |
| `decelerate=(undefined)`| (initial)| `<null>` |

## `default` (on `<track>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `default=(string)`| (changed)| `<boolean: true>` |
| `default=(empty string)`| (initial)| `<boolean: false>` |
| `default=(array with string)`| (changed)| `<boolean: true>` |
| `default=(empty array)`| (changed)| `<boolean: true>` |
| `default=(object)`| (changed)| `<boolean: true>` |
| `default=(numeric string)`| (changed)| `<boolean: true>` |
| `default=(-1)`| (changed)| `<boolean: true>` |
| `default=(0)`| (initial)| `<boolean: false>` |
| `default=(integer)`| (changed)| `<boolean: true>` |
| `default=(NaN)`| (initial, warning)| `<boolean: false>` |
| `default=(float)`| (changed)| `<boolean: true>` |
| `default=(true)`| (changed)| `<boolean: true>` |
| `default=(false)`| (initial)| `<boolean: false>` |
| `default=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `default=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `default=(string 'on')`| (changed)| `<boolean: true>` |
| `default=(string 'off')`| (changed)| `<boolean: true>` |
| `default=(symbol)`| (initial, warning)| `<boolean: false>` |
| `default=(function)`| (initial, warning)| `<boolean: false>` |
| `default=(null)`| (initial)| `<boolean: false>` |
| `default=(undefined)`| (initial)| `<boolean: false>` |

## `defaultchecked` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `defaultchecked=(string)`| (changed, warning)| `"a string"` |
| `defaultchecked=(empty string)`| (changed, warning)| `<empty string>` |
| `defaultchecked=(array with string)`| (changed, warning)| `"string"` |
| `defaultchecked=(empty array)`| (changed, warning)| `<empty string>` |
| `defaultchecked=(object)`| (changed, warning)| `"result of toString()"` |
| `defaultchecked=(numeric string)`| (changed, warning)| `"42"` |
| `defaultchecked=(-1)`| (changed, warning)| `"-1"` |
| `defaultchecked=(0)`| (changed, warning)| `"0"` |
| `defaultchecked=(integer)`| (changed, warning)| `"1"` |
| `defaultchecked=(NaN)`| (changed, warning)| `"NaN"` |
| `defaultchecked=(float)`| (changed, warning)| `"99.99"` |
| `defaultchecked=(true)`| (initial, warning)| `<null>` |
| `defaultchecked=(false)`| (initial, warning)| `<null>` |
| `defaultchecked=(string 'true')`| (changed, warning)| `"true"` |
| `defaultchecked=(string 'false')`| (changed, warning)| `"false"` |
| `defaultchecked=(string 'on')`| (changed, warning)| `"on"` |
| `defaultchecked=(string 'off')`| (changed, warning)| `"off"` |
| `defaultchecked=(symbol)`| (initial, warning)| `<null>` |
| `defaultchecked=(function)`| (initial, warning)| `<null>` |
| `defaultchecked=(null)`| (initial, warning)| `<null>` |
| `defaultchecked=(undefined)`| (initial, warning)| `<null>` |

## `defaultChecked` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `defaultChecked=(string)`| (changed)| `<boolean: true>` |
| `defaultChecked=(empty string)`| (initial)| `<boolean: false>` |
| `defaultChecked=(array with string)`| (changed)| `<boolean: true>` |
| `defaultChecked=(empty array)`| (changed)| `<boolean: true>` |
| `defaultChecked=(object)`| (changed)| `<boolean: true>` |
| `defaultChecked=(numeric string)`| (changed)| `<boolean: true>` |
| `defaultChecked=(-1)`| (changed)| `<boolean: true>` |
| `defaultChecked=(0)`| (initial)| `<boolean: false>` |
| `defaultChecked=(integer)`| (changed)| `<boolean: true>` |
| `defaultChecked=(NaN)`| (initial, warning)| `<boolean: false>` |
| `defaultChecked=(float)`| (changed)| `<boolean: true>` |
| `defaultChecked=(true)`| (changed)| `<boolean: true>` |
| `defaultChecked=(false)`| (initial)| `<boolean: false>` |
| `defaultChecked=(string 'true')`| (changed)| `<boolean: true>` |
| `defaultChecked=(string 'false')`| (changed)| `<boolean: true>` |
| `defaultChecked=(string 'on')`| (changed)| `<boolean: true>` |
| `defaultChecked=(string 'off')`| (changed)| `<boolean: true>` |
| `defaultChecked=(symbol)`| (initial)| `<boolean: false>` |
| `defaultChecked=(function)`| (initial)| `<boolean: false>` |
| `defaultChecked=(null)`| (initial)| `<boolean: false>` |
| `defaultChecked=(undefined)`| (initial)| `<boolean: false>` |

## `defaultValue` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `defaultValue=(string)`| (changed)| `"a string"` |
| `defaultValue=(empty string)`| (initial)| `<empty string>` |
| `defaultValue=(array with string)`| (changed)| `"string"` |
| `defaultValue=(empty array)`| (initial)| `<empty string>` |
| `defaultValue=(object)`| (changed)| `"result of toString()"` |
| `defaultValue=(numeric string)`| (changed)| `"42"` |
| `defaultValue=(-1)`| (changed)| `"-1"` |
| `defaultValue=(0)`| (changed)| `"0"` |
| `defaultValue=(integer)`| (changed)| `"1"` |
| `defaultValue=(NaN)`| (changed, warning)| `"NaN"` |
| `defaultValue=(float)`| (changed)| `"99.99"` |
| `defaultValue=(true)`| (changed)| `"true"` |
| `defaultValue=(false)`| (changed)| `"false"` |
| `defaultValue=(string 'true')`| (changed)| `"true"` |
| `defaultValue=(string 'false')`| (changed)| `"false"` |
| `defaultValue=(string 'on')`| (changed)| `"on"` |
| `defaultValue=(string 'off')`| (changed)| `"off"` |
| `defaultValue=(symbol)`| (initial)| `<empty string>` |
| `defaultValue=(function)`| (initial)| `<empty string>` |
| `defaultValue=(null)`| (initial)| `<empty string>` |
| `defaultValue=(undefined)`| (initial)| `<empty string>` |

## `defaultValuE` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `defaultValuE=(string)`| (changed, warning)| `"a string"` |
| `defaultValuE=(empty string)`| (changed, warning)| `<empty string>` |
| `defaultValuE=(array with string)`| (changed, warning)| `"string"` |
| `defaultValuE=(empty array)`| (changed, warning)| `<empty string>` |
| `defaultValuE=(object)`| (changed, warning)| `"result of toString()"` |
| `defaultValuE=(numeric string)`| (changed, warning)| `"42"` |
| `defaultValuE=(-1)`| (changed, warning)| `"-1"` |
| `defaultValuE=(0)`| (changed, warning)| `"0"` |
| `defaultValuE=(integer)`| (changed, warning)| `"1"` |
| `defaultValuE=(NaN)`| (changed, warning)| `"NaN"` |
| `defaultValuE=(float)`| (changed, warning)| `"99.99"` |
| `defaultValuE=(true)`| (initial, warning)| `<null>` |
| `defaultValuE=(false)`| (initial, warning)| `<null>` |
| `defaultValuE=(string 'true')`| (changed, warning)| `"true"` |
| `defaultValuE=(string 'false')`| (changed, warning)| `"false"` |
| `defaultValuE=(string 'on')`| (changed, warning)| `"on"` |
| `defaultValuE=(string 'off')`| (changed, warning)| `"off"` |
| `defaultValuE=(symbol)`| (initial, warning)| `<null>` |
| `defaultValuE=(function)`| (initial, warning)| `<null>` |
| `defaultValuE=(null)`| (initial, warning)| `<null>` |
| `defaultValuE=(undefined)`| (initial, warning)| `<null>` |

## `defer` (on `<script>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `defer=(string)`| (changed)| `<boolean: true>` |
| `defer=(empty string)`| (initial)| `<boolean: false>` |
| `defer=(array with string)`| (changed)| `<boolean: true>` |
| `defer=(empty array)`| (changed)| `<boolean: true>` |
| `defer=(object)`| (changed)| `<boolean: true>` |
| `defer=(numeric string)`| (changed)| `<boolean: true>` |
| `defer=(-1)`| (changed)| `<boolean: true>` |
| `defer=(0)`| (initial)| `<boolean: false>` |
| `defer=(integer)`| (changed)| `<boolean: true>` |
| `defer=(NaN)`| (initial, warning)| `<boolean: false>` |
| `defer=(float)`| (changed)| `<boolean: true>` |
| `defer=(true)`| (changed)| `<boolean: true>` |
| `defer=(false)`| (initial)| `<boolean: false>` |
| `defer=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `defer=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `defer=(string 'on')`| (changed)| `<boolean: true>` |
| `defer=(string 'off')`| (changed)| `<boolean: true>` |
| `defer=(symbol)`| (initial, warning)| `<boolean: false>` |
| `defer=(function)`| (initial, warning)| `<boolean: false>` |
| `defer=(null)`| (initial)| `<boolean: false>` |
| `defer=(undefined)`| (initial)| `<boolean: false>` |

## `descent` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `descent=(string)`| (changed)| `"a string"` |
| `descent=(empty string)`| (changed)| `<empty string>` |
| `descent=(array with string)`| (changed)| `"string"` |
| `descent=(empty array)`| (changed)| `<empty string>` |
| `descent=(object)`| (changed)| `"result of toString()"` |
| `descent=(numeric string)`| (changed)| `"42"` |
| `descent=(-1)`| (changed)| `"-1"` |
| `descent=(0)`| (changed)| `"0"` |
| `descent=(integer)`| (changed)| `"1"` |
| `descent=(NaN)`| (changed, warning)| `"NaN"` |
| `descent=(float)`| (changed)| `"99.99"` |
| `descent=(true)`| (initial, warning)| `<null>` |
| `descent=(false)`| (initial, warning)| `<null>` |
| `descent=(string 'true')`| (changed)| `"true"` |
| `descent=(string 'false')`| (changed)| `"false"` |
| `descent=(string 'on')`| (changed)| `"on"` |
| `descent=(string 'off')`| (changed)| `"off"` |
| `descent=(symbol)`| (initial, warning)| `<null>` |
| `descent=(function)`| (initial, warning)| `<null>` |
| `descent=(null)`| (initial)| `<null>` |
| `descent=(undefined)`| (initial)| `<null>` |

## `diffuseConstant` (on `<feDiffuseLighting>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `diffuseConstant=(string)`| (initial)| `<number: 1>` |
| `diffuseConstant=(empty string)`| (changed)| `<number: 0>` |
| `diffuseConstant=(array with string)`| (initial)| `<number: 1>` |
| `diffuseConstant=(empty array)`| (changed)| `<number: 0>` |
| `diffuseConstant=(object)`| (initial)| `<number: 1>` |
| `diffuseConstant=(numeric string)`| (changed)| `<number: 42>` |
| `diffuseConstant=(-1)`| (changed)| `<number: -1>` |
| `diffuseConstant=(0)`| (changed)| `<number: 0>` |
| `diffuseConstant=(integer)`| (initial)| `<number: 1>` |
| `diffuseConstant=(NaN)`| (initial, warning)| `<number: 1>` |
| `diffuseConstant=(float)`| (changed)| `<number: 99.98999786376953>` |
| `diffuseConstant=(true)`| (initial, warning)| `<number: 1>` |
| `diffuseConstant=(false)`| (initial, warning)| `<number: 1>` |
| `diffuseConstant=(string 'true')`| (initial)| `<number: 1>` |
| `diffuseConstant=(string 'false')`| (initial)| `<number: 1>` |
| `diffuseConstant=(string 'on')`| (initial)| `<number: 1>` |
| `diffuseConstant=(string 'off')`| (initial)| `<number: 1>` |
| `diffuseConstant=(symbol)`| (initial, warning)| `<number: 1>` |
| `diffuseConstant=(function)`| (initial, warning)| `<number: 1>` |
| `diffuseConstant=(null)`| (initial)| `<number: 1>` |
| `diffuseConstant=(undefined)`| (initial)| `<number: 1>` |

## `dir` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `dir=(string)`| (changed)| `"rtl"` |
| `dir=(empty string)`| (initial)| `<empty string>` |
| `dir=(array with string)`| (changed)| `"rtl"` |
| `dir=(empty array)`| (initial)| `<empty string>` |
| `dir=(object)`| (initial)| `<empty string>` |
| `dir=(numeric string)`| (initial)| `<empty string>` |
| `dir=(-1)`| (initial)| `<empty string>` |
| `dir=(0)`| (initial)| `<empty string>` |
| `dir=(integer)`| (initial)| `<empty string>` |
| `dir=(NaN)`| (initial, warning)| `<empty string>` |
| `dir=(float)`| (initial)| `<empty string>` |
| `dir=(true)`| (initial, warning)| `<empty string>` |
| `dir=(false)`| (initial, warning)| `<empty string>` |
| `dir=(string 'true')`| (initial)| `<empty string>` |
| `dir=(string 'false')`| (initial)| `<empty string>` |
| `dir=(string 'on')`| (initial)| `<empty string>` |
| `dir=(string 'off')`| (initial)| `<empty string>` |
| `dir=(symbol)`| (initial, warning)| `<empty string>` |
| `dir=(function)`| (initial, warning)| `<empty string>` |
| `dir=(null)`| (initial)| `<empty string>` |
| `dir=(undefined)`| (initial)| `<empty string>` |

## `direction` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `direction=(string)`| (changed)| `"rtl"` |
| `direction=(empty string)`| (changed)| `<empty string>` |
| `direction=(array with string)`| (changed)| `"rtl"` |
| `direction=(empty array)`| (changed)| `<empty string>` |
| `direction=(object)`| (changed)| `"result of toString()"` |
| `direction=(numeric string)`| (changed)| `"42"` |
| `direction=(-1)`| (changed)| `"-1"` |
| `direction=(0)`| (changed)| `"0"` |
| `direction=(integer)`| (changed)| `"1"` |
| `direction=(NaN)`| (changed, warning)| `"NaN"` |
| `direction=(float)`| (changed)| `"99.99"` |
| `direction=(true)`| (initial, warning)| `<null>` |
| `direction=(false)`| (initial, warning)| `<null>` |
| `direction=(string 'true')`| (changed)| `"true"` |
| `direction=(string 'false')`| (changed)| `"false"` |
| `direction=(string 'on')`| (changed)| `"on"` |
| `direction=(string 'off')`| (changed)| `"off"` |
| `direction=(symbol)`| (initial, warning)| `<null>` |
| `direction=(function)`| (initial, warning)| `<null>` |
| `direction=(null)`| (initial)| `<null>` |
| `direction=(undefined)`| (initial)| `<null>` |

## `disabled` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `disabled=(string)`| (changed)| `<boolean: true>` |
| `disabled=(empty string)`| (initial)| `<boolean: false>` |
| `disabled=(array with string)`| (changed)| `<boolean: true>` |
| `disabled=(empty array)`| (changed)| `<boolean: true>` |
| `disabled=(object)`| (changed)| `<boolean: true>` |
| `disabled=(numeric string)`| (changed)| `<boolean: true>` |
| `disabled=(-1)`| (changed)| `<boolean: true>` |
| `disabled=(0)`| (initial)| `<boolean: false>` |
| `disabled=(integer)`| (changed)| `<boolean: true>` |
| `disabled=(NaN)`| (initial, warning)| `<boolean: false>` |
| `disabled=(float)`| (changed)| `<boolean: true>` |
| `disabled=(true)`| (changed)| `<boolean: true>` |
| `disabled=(false)`| (initial)| `<boolean: false>` |
| `disabled=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `disabled=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `disabled=(string 'on')`| (changed)| `<boolean: true>` |
| `disabled=(string 'off')`| (changed)| `<boolean: true>` |
| `disabled=(symbol)`| (initial, warning)| `<boolean: false>` |
| `disabled=(function)`| (initial, warning)| `<boolean: false>` |
| `disabled=(null)`| (initial)| `<boolean: false>` |
| `disabled=(undefined)`| (initial)| `<boolean: false>` |

## `disablePictureInPicture` (on `<video>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `disablePictureInPicture=(string)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(empty string)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(array with string)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(empty array)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(object)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(numeric string)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(-1)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(0)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(integer)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(NaN)`| (initial, warning)| `<undefined>` |
| `disablePictureInPicture=(float)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(true)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(false)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(string 'true')`| (initial, warning)| `<undefined>` |
| `disablePictureInPicture=(string 'false')`| (initial, warning)| `<undefined>` |
| `disablePictureInPicture=(string 'on')`| (initial)| `<undefined>` |
| `disablePictureInPicture=(string 'off')`| (initial)| `<undefined>` |
| `disablePictureInPicture=(symbol)`| (initial, warning)| `<undefined>` |
| `disablePictureInPicture=(function)`| (initial, warning)| `<undefined>` |
| `disablePictureInPicture=(null)`| (initial)| `<undefined>` |
| `disablePictureInPicture=(undefined)`| (initial)| `<undefined>` |

## `disableRemotePlayback` (on `<video>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `disableRemotePlayback=(string)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(empty string)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(array with string)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(empty array)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(object)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(numeric string)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(-1)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(0)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(integer)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(NaN)`| (initial, warning)| `<undefined>` |
| `disableRemotePlayback=(float)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(true)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(false)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(string 'true')`| (initial, warning)| `<undefined>` |
| `disableRemotePlayback=(string 'false')`| (initial, warning)| `<undefined>` |
| `disableRemotePlayback=(string 'on')`| (initial)| `<undefined>` |
| `disableRemotePlayback=(string 'off')`| (initial)| `<undefined>` |
| `disableRemotePlayback=(symbol)`| (initial, warning)| `<undefined>` |
| `disableRemotePlayback=(function)`| (initial, warning)| `<undefined>` |
| `disableRemotePlayback=(null)`| (initial)| `<undefined>` |
| `disableRemotePlayback=(undefined)`| (initial)| `<undefined>` |

## `display` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `display=(string)`| (changed)| `"list-item"` |
| `display=(empty string)`| (changed)| `<empty string>` |
| `display=(array with string)`| (changed)| `"list-item"` |
| `display=(empty array)`| (changed)| `<empty string>` |
| `display=(object)`| (changed)| `"result of toString()"` |
| `display=(numeric string)`| (changed)| `"42"` |
| `display=(-1)`| (changed)| `"-1"` |
| `display=(0)`| (changed)| `"0"` |
| `display=(integer)`| (changed)| `"1"` |
| `display=(NaN)`| (changed, warning)| `"NaN"` |
| `display=(float)`| (changed)| `"99.99"` |
| `display=(true)`| (initial, warning)| `<null>` |
| `display=(false)`| (initial, warning)| `<null>` |
| `display=(string 'true')`| (changed)| `"true"` |
| `display=(string 'false')`| (changed)| `"false"` |
| `display=(string 'on')`| (changed)| `"on"` |
| `display=(string 'off')`| (changed)| `"off"` |
| `display=(symbol)`| (initial, warning)| `<null>` |
| `display=(function)`| (initial, warning)| `<null>` |
| `display=(null)`| (initial)| `<null>` |
| `display=(undefined)`| (initial)| `<null>` |

## `divisor` (on `<feConvolveMatrix>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `divisor=(string)`| (initial)| `<number: 1>` |
| `divisor=(empty string)`| (changed)| `<number: 0>` |
| `divisor=(array with string)`| (initial)| `<number: 1>` |
| `divisor=(empty array)`| (changed)| `<number: 0>` |
| `divisor=(object)`| (initial)| `<number: 1>` |
| `divisor=(numeric string)`| (changed)| `<number: 42>` |
| `divisor=(-1)`| (changed)| `<number: -1>` |
| `divisor=(0)`| (changed)| `<number: 0>` |
| `divisor=(integer)`| (initial)| `<number: 1>` |
| `divisor=(NaN)`| (initial, warning)| `<number: 1>` |
| `divisor=(float)`| (changed)| `<number: 99.98999786376953>` |
| `divisor=(true)`| (initial, warning)| `<number: 1>` |
| `divisor=(false)`| (initial, warning)| `<number: 1>` |
| `divisor=(string 'true')`| (initial)| `<number: 1>` |
| `divisor=(string 'false')`| (initial)| `<number: 1>` |
| `divisor=(string 'on')`| (initial)| `<number: 1>` |
| `divisor=(string 'off')`| (initial)| `<number: 1>` |
| `divisor=(symbol)`| (initial, warning)| `<number: 1>` |
| `divisor=(function)`| (initial, warning)| `<number: 1>` |
| `divisor=(null)`| (initial)| `<number: 1>` |
| `divisor=(undefined)`| (initial)| `<number: 1>` |

## `dominant-baseline` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `dominant-baseline=(string)`| (changed, warning)| `"a string"` |
| `dominant-baseline=(empty string)`| (changed, warning)| `<empty string>` |
| `dominant-baseline=(array with string)`| (changed, warning)| `"string"` |
| `dominant-baseline=(empty array)`| (changed, warning)| `<empty string>` |
| `dominant-baseline=(object)`| (changed, warning)| `"result of toString()"` |
| `dominant-baseline=(numeric string)`| (changed, warning)| `"42"` |
| `dominant-baseline=(-1)`| (changed, warning)| `"-1"` |
| `dominant-baseline=(0)`| (changed, warning)| `"0"` |
| `dominant-baseline=(integer)`| (changed, warning)| `"1"` |
| `dominant-baseline=(NaN)`| (changed, warning)| `"NaN"` |
| `dominant-baseline=(float)`| (changed, warning)| `"99.99"` |
| `dominant-baseline=(true)`| (initial, warning)| `<null>` |
| `dominant-baseline=(false)`| (initial, warning)| `<null>` |
| `dominant-baseline=(string 'true')`| (changed, warning)| `"true"` |
| `dominant-baseline=(string 'false')`| (changed, warning)| `"false"` |
| `dominant-baseline=(string 'on')`| (changed, warning)| `"on"` |
| `dominant-baseline=(string 'off')`| (changed, warning)| `"off"` |
| `dominant-baseline=(symbol)`| (initial, warning)| `<null>` |
| `dominant-baseline=(function)`| (initial, warning)| `<null>` |
| `dominant-baseline=(null)`| (initial, warning)| `<null>` |
| `dominant-baseline=(undefined)`| (initial, warning)| `<null>` |

## `dominantBaseline` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `dominantBaseline=(string)`| (changed)| `"a string"` |
| `dominantBaseline=(empty string)`| (changed)| `<empty string>` |
| `dominantBaseline=(array with string)`| (changed)| `"string"` |
| `dominantBaseline=(empty array)`| (changed)| `<empty string>` |
| `dominantBaseline=(object)`| (changed)| `"result of toString()"` |
| `dominantBaseline=(numeric string)`| (changed)| `"42"` |
| `dominantBaseline=(-1)`| (changed)| `"-1"` |
| `dominantBaseline=(0)`| (changed)| `"0"` |
| `dominantBaseline=(integer)`| (changed)| `"1"` |
| `dominantBaseline=(NaN)`| (changed, warning)| `"NaN"` |
| `dominantBaseline=(float)`| (changed)| `"99.99"` |
| `dominantBaseline=(true)`| (initial, warning)| `<null>` |
| `dominantBaseline=(false)`| (initial, warning)| `<null>` |
| `dominantBaseline=(string 'true')`| (changed)| `"true"` |
| `dominantBaseline=(string 'false')`| (changed)| `"false"` |
| `dominantBaseline=(string 'on')`| (changed)| `"on"` |
| `dominantBaseline=(string 'off')`| (changed)| `"off"` |
| `dominantBaseline=(symbol)`| (initial, warning)| `<null>` |
| `dominantBaseline=(function)`| (initial, warning)| `<null>` |
| `dominantBaseline=(null)`| (initial)| `<null>` |
| `dominantBaseline=(undefined)`| (initial)| `<null>` |

## `download` (on `<a>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `download=(string)`| (changed)| `"a string"` |
| `download=(empty string)`| (initial)| `<empty string>` |
| `download=(array with string)`| (changed)| `"string"` |
| `download=(empty array)`| (initial)| `<empty string>` |
| `download=(object)`| (changed)| `"result of toString()"` |
| `download=(numeric string)`| (changed)| `"42"` |
| `download=(-1)`| (changed)| `"-1"` |
| `download=(0)`| (changed)| `"0"` |
| `download=(integer)`| (changed)| `"1"` |
| `download=(NaN)`| (changed, warning)| `"NaN"` |
| `download=(float)`| (changed)| `"99.99"` |
| `download=(true)`| (initial)| `<empty string>` |
| `download=(false)`| (initial)| `<empty string>` |
| `download=(string 'true')`| (changed)| `"true"` |
| `download=(string 'false')`| (changed)| `"false"` |
| `download=(string 'on')`| (changed)| `"on"` |
| `download=(string 'off')`| (changed)| `"off"` |
| `download=(symbol)`| (initial, warning)| `<empty string>` |
| `download=(function)`| (initial, warning)| `<empty string>` |
| `download=(null)`| (initial)| `<empty string>` |
| `download=(undefined)`| (initial)| `<empty string>` |

## `dOwNlOaD` (on `<a>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `dOwNlOaD=(string)`| (changed, warning)| `"a string"` |
| `dOwNlOaD=(empty string)`| (changed, warning)| `<empty string>` |
| `dOwNlOaD=(array with string)`| (changed, warning)| `"string"` |
| `dOwNlOaD=(empty array)`| (changed, warning)| `<empty string>` |
| `dOwNlOaD=(object)`| (changed, warning)| `"result of toString()"` |
| `dOwNlOaD=(numeric string)`| (changed, warning)| `"42"` |
| `dOwNlOaD=(-1)`| (changed, warning)| `"-1"` |
| `dOwNlOaD=(0)`| (changed, warning)| `"0"` |
| `dOwNlOaD=(integer)`| (changed, warning)| `"1"` |
| `dOwNlOaD=(NaN)`| (changed, warning)| `"NaN"` |
| `dOwNlOaD=(float)`| (changed, warning)| `"99.99"` |
| `dOwNlOaD=(true)`| (initial, warning)| `<null>` |
| `dOwNlOaD=(false)`| (initial, warning)| `<null>` |
| `dOwNlOaD=(string 'true')`| (changed, warning)| `"true"` |
| `dOwNlOaD=(string 'false')`| (changed, warning)| `"false"` |
| `dOwNlOaD=(string 'on')`| (changed, warning)| `"on"` |
| `dOwNlOaD=(string 'off')`| (changed, warning)| `"off"` |
| `dOwNlOaD=(symbol)`| (initial, warning)| `<null>` |
| `dOwNlOaD=(function)`| (initial, warning)| `<null>` |
| `dOwNlOaD=(null)`| (initial, warning)| `<null>` |
| `dOwNlOaD=(undefined)`| (initial, warning)| `<null>` |

## `draggable` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `draggable=(string)`| (initial)| `<boolean: false>` |
| `draggable=(empty string)`| (initial)| `<boolean: false>` |
| `draggable=(array with string)`| (initial)| `<boolean: false>` |
| `draggable=(empty array)`| (initial)| `<boolean: false>` |
| `draggable=(object)`| (initial)| `<boolean: false>` |
| `draggable=(numeric string)`| (initial)| `<boolean: false>` |
| `draggable=(-1)`| (initial)| `<boolean: false>` |
| `draggable=(0)`| (initial)| `<boolean: false>` |
| `draggable=(integer)`| (initial)| `<boolean: false>` |
| `draggable=(NaN)`| (initial, warning)| `<boolean: false>` |
| `draggable=(float)`| (initial)| `<boolean: false>` |
| `draggable=(true)`| (changed)| `<boolean: true>` |
| `draggable=(false)`| (initial)| `<boolean: false>` |
| `draggable=(string 'true')`| (changed)| `<boolean: true>` |
| `draggable=(string 'false')`| (initial)| `<boolean: false>` |
| `draggable=(string 'on')`| (initial)| `<boolean: false>` |
| `draggable=(string 'off')`| (initial)| `<boolean: false>` |
| `draggable=(symbol)`| (initial, warning)| `<boolean: false>` |
| `draggable=(function)`| (initial, warning)| `<boolean: false>` |
| `draggable=(null)`| (initial)| `<boolean: false>` |
| `draggable=(undefined)`| (initial)| `<boolean: false>` |

## `dur` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `dur=(string)`| (changed)| `"a string"` |
| `dur=(empty string)`| (changed)| `<empty string>` |
| `dur=(array with string)`| (changed)| `"string"` |
| `dur=(empty array)`| (changed)| `<empty string>` |
| `dur=(object)`| (changed)| `"result of toString()"` |
| `dur=(numeric string)`| (changed)| `"42"` |
| `dur=(-1)`| (changed)| `"-1"` |
| `dur=(0)`| (changed)| `"0"` |
| `dur=(integer)`| (changed)| `"1"` |
| `dur=(NaN)`| (changed, warning)| `"NaN"` |
| `dur=(float)`| (changed)| `"99.99"` |
| `dur=(true)`| (initial, warning)| `<null>` |
| `dur=(false)`| (initial, warning)| `<null>` |
| `dur=(string 'true')`| (changed)| `"true"` |
| `dur=(string 'false')`| (changed)| `"false"` |
| `dur=(string 'on')`| (changed)| `"on"` |
| `dur=(string 'off')`| (changed)| `"off"` |
| `dur=(symbol)`| (initial, warning)| `<null>` |
| `dur=(function)`| (initial, warning)| `<null>` |
| `dur=(null)`| (initial)| `<null>` |
| `dur=(undefined)`| (initial)| `<null>` |

## `dx` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `dx=(string)`| (changed)| `[<SVGLength: 1pt>, <SVGLength: 2px>, <SVGLength: 3em>]` |
| `dx=(empty string)`| (initial)| `[]` |
| `dx=(array with string)`| (changed)| `[<SVGLength: 1pt>, <SVGLength: 2px>, <SVGLength: 3em>]` |
| `dx=(empty array)`| (initial)| `[]` |
| `dx=(object)`| (initial)| `[]` |
| `dx=(numeric string)`| (changed)| `[<SVGLength: 42>]` |
| `dx=(-1)`| (changed)| `[<SVGLength: -1>]` |
| `dx=(0)`| (changed)| `[<SVGLength: 0>]` |
| `dx=(integer)`| (changed)| `[<SVGLength: 1>]` |
| `dx=(NaN)`| (initial, warning)| `[]` |
| `dx=(float)`| (changed)| `[<SVGLength: 99.99>]` |
| `dx=(true)`| (initial, warning)| `[]` |
| `dx=(false)`| (initial, warning)| `[]` |
| `dx=(string 'true')`| (initial)| `[]` |
| `dx=(string 'false')`| (initial)| `[]` |
| `dx=(string 'on')`| (initial)| `[]` |
| `dx=(string 'off')`| (initial)| `[]` |
| `dx=(symbol)`| (initial, warning)| `[]` |
| `dx=(function)`| (initial, warning)| `[]` |
| `dx=(null)`| (initial)| `[]` |
| `dx=(undefined)`| (initial)| `[]` |

## `dX` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `dX=(string)`| (initial, warning, ssr mismatch)| `[]` |
| `dX=(empty string)`| (initial, warning)| `[]` |
| `dX=(array with string)`| (initial, warning, ssr mismatch)| `[]` |
| `dX=(empty array)`| (initial, warning)| `[]` |
| `dX=(object)`| (initial, warning)| `[]` |
| `dX=(numeric string)`| (initial, warning, ssr mismatch)| `[]` |
| `dX=(-1)`| (initial, warning, ssr mismatch)| `[]` |
| `dX=(0)`| (initial, warning, ssr mismatch)| `[]` |
| `dX=(integer)`| (initial, warning, ssr mismatch)| `[]` |
| `dX=(NaN)`| (initial, warning)| `[]` |
| `dX=(float)`| (initial, warning, ssr mismatch)| `[]` |
| `dX=(true)`| (initial, warning)| `[]` |
| `dX=(false)`| (initial, warning)| `[]` |
| `dX=(string 'true')`| (initial, warning)| `[]` |
| `dX=(string 'false')`| (initial, warning)| `[]` |
| `dX=(string 'on')`| (initial, warning)| `[]` |
| `dX=(string 'off')`| (initial, warning)| `[]` |
| `dX=(symbol)`| (initial, warning)| `[]` |
| `dX=(function)`| (initial, warning)| `[]` |
| `dX=(null)`| (initial, warning)| `[]` |
| `dX=(undefined)`| (initial, warning)| `[]` |

## `dy` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `dy=(string)`| (changed)| `[<SVGLength: 1>, <SVGLength: 2>, <SVGLength: 3>]` |
| `dy=(empty string)`| (initial)| `[]` |
| `dy=(array with string)`| (changed)| `[<SVGLength: 1>, <SVGLength: 2>, <SVGLength: 3>]` |
| `dy=(empty array)`| (initial)| `[]` |
| `dy=(object)`| (initial)| `[]` |
| `dy=(numeric string)`| (changed)| `[<SVGLength: 42>]` |
| `dy=(-1)`| (changed)| `[<SVGLength: -1>]` |
| `dy=(0)`| (changed)| `[<SVGLength: 0>]` |
| `dy=(integer)`| (changed)| `[<SVGLength: 1>]` |
| `dy=(NaN)`| (initial, warning)| `[]` |
| `dy=(float)`| (changed)| `[<SVGLength: 99.99>]` |
| `dy=(true)`| (initial, warning)| `[]` |
| `dy=(false)`| (initial, warning)| `[]` |
| `dy=(string 'true')`| (initial)| `[]` |
| `dy=(string 'false')`| (initial)| `[]` |
| `dy=(string 'on')`| (initial)| `[]` |
| `dy=(string 'off')`| (initial)| `[]` |
| `dy=(symbol)`| (initial, warning)| `[]` |
| `dy=(function)`| (initial, warning)| `[]` |
| `dy=(null)`| (initial)| `[]` |
| `dy=(undefined)`| (initial)| `[]` |

## `dY` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `dY=(string)`| (initial, warning, ssr mismatch)| `[]` |
| `dY=(empty string)`| (initial, warning)| `[]` |
| `dY=(array with string)`| (initial, warning, ssr mismatch)| `[]` |
| `dY=(empty array)`| (initial, warning)| `[]` |
| `dY=(object)`| (initial, warning)| `[]` |
| `dY=(numeric string)`| (initial, warning, ssr mismatch)| `[]` |
| `dY=(-1)`| (initial, warning, ssr mismatch)| `[]` |
| `dY=(0)`| (initial, warning, ssr mismatch)| `[]` |
| `dY=(integer)`| (initial, warning, ssr mismatch)| `[]` |
| `dY=(NaN)`| (initial, warning)| `[]` |
| `dY=(float)`| (initial, warning, ssr mismatch)| `[]` |
| `dY=(true)`| (initial, warning)| `[]` |
| `dY=(false)`| (initial, warning)| `[]` |
| `dY=(string 'true')`| (initial, warning)| `[]` |
| `dY=(string 'false')`| (initial, warning)| `[]` |
| `dY=(string 'on')`| (initial, warning)| `[]` |
| `dY=(string 'off')`| (initial, warning)| `[]` |
| `dY=(symbol)`| (initial, warning)| `[]` |
| `dY=(function)`| (initial, warning)| `[]` |
| `dY=(null)`| (initial, warning)| `[]` |
| `dY=(undefined)`| (initial, warning)| `[]` |

## `edgeMode` (on `<feConvolveMatrix>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `edgeMode=(string)`| (changed)| `<number: 2>` |
| `edgeMode=(empty string)`| (initial)| `<number: 1>` |
| `edgeMode=(array with string)`| (changed)| `<number: 2>` |
| `edgeMode=(empty array)`| (initial)| `<number: 1>` |
| `edgeMode=(object)`| (initial)| `<number: 1>` |
| `edgeMode=(numeric string)`| (initial)| `<number: 1>` |
| `edgeMode=(-1)`| (initial)| `<number: 1>` |
| `edgeMode=(0)`| (initial)| `<number: 1>` |
| `edgeMode=(integer)`| (initial)| `<number: 1>` |
| `edgeMode=(NaN)`| (initial, warning)| `<number: 1>` |
| `edgeMode=(float)`| (initial)| `<number: 1>` |
| `edgeMode=(true)`| (initial, warning)| `<number: 1>` |
| `edgeMode=(false)`| (initial, warning)| `<number: 1>` |
| `edgeMode=(string 'true')`| (initial)| `<number: 1>` |
| `edgeMode=(string 'false')`| (initial)| `<number: 1>` |
| `edgeMode=(string 'on')`| (initial)| `<number: 1>` |
| `edgeMode=(string 'off')`| (initial)| `<number: 1>` |
| `edgeMode=(symbol)`| (initial, warning)| `<number: 1>` |
| `edgeMode=(function)`| (initial, warning)| `<number: 1>` |
| `edgeMode=(null)`| (initial)| `<number: 1>` |
| `edgeMode=(undefined)`| (initial)| `<number: 1>` |

## `elevation` (on `<feDistantLight>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `elevation=(string)`| (initial)| `<number: 0>` |
| `elevation=(empty string)`| (initial)| `<number: 0>` |
| `elevation=(array with string)`| (initial)| `<number: 0>` |
| `elevation=(empty array)`| (initial)| `<number: 0>` |
| `elevation=(object)`| (initial)| `<number: 0>` |
| `elevation=(numeric string)`| (changed)| `<number: 42>` |
| `elevation=(-1)`| (changed)| `<number: -1>` |
| `elevation=(0)`| (initial)| `<number: 0>` |
| `elevation=(integer)`| (changed)| `<number: 1>` |
| `elevation=(NaN)`| (initial, warning)| `<number: 0>` |
| `elevation=(float)`| (changed)| `<number: 99.98999786376953>` |
| `elevation=(true)`| (initial, warning)| `<number: 0>` |
| `elevation=(false)`| (initial, warning)| `<number: 0>` |
| `elevation=(string 'true')`| (initial)| `<number: 0>` |
| `elevation=(string 'false')`| (initial)| `<number: 0>` |
| `elevation=(string 'on')`| (initial)| `<number: 0>` |
| `elevation=(string 'off')`| (initial)| `<number: 0>` |
| `elevation=(symbol)`| (initial, warning)| `<number: 0>` |
| `elevation=(function)`| (initial, warning)| `<number: 0>` |
| `elevation=(null)`| (initial)| `<number: 0>` |
| `elevation=(undefined)`| (initial)| `<number: 0>` |

## `enable-background` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `enable-background=(string)`| (changed, warning)| `"a string"` |
| `enable-background=(empty string)`| (changed, warning)| `<empty string>` |
| `enable-background=(array with string)`| (changed, warning)| `"string"` |
| `enable-background=(empty array)`| (changed, warning)| `<empty string>` |
| `enable-background=(object)`| (changed, warning)| `"result of toString()"` |
| `enable-background=(numeric string)`| (changed, warning)| `"42"` |
| `enable-background=(-1)`| (changed, warning)| `"-1"` |
| `enable-background=(0)`| (changed, warning)| `"0"` |
| `enable-background=(integer)`| (changed, warning)| `"1"` |
| `enable-background=(NaN)`| (changed, warning)| `"NaN"` |
| `enable-background=(float)`| (changed, warning)| `"99.99"` |
| `enable-background=(true)`| (initial, warning)| `<null>` |
| `enable-background=(false)`| (initial, warning)| `<null>` |
| `enable-background=(string 'true')`| (changed, warning)| `"true"` |
| `enable-background=(string 'false')`| (changed, warning)| `"false"` |
| `enable-background=(string 'on')`| (changed, warning)| `"on"` |
| `enable-background=(string 'off')`| (changed, warning)| `"off"` |
| `enable-background=(symbol)`| (initial, warning)| `<null>` |
| `enable-background=(function)`| (initial, warning)| `<null>` |
| `enable-background=(null)`| (initial, warning)| `<null>` |
| `enable-background=(undefined)`| (initial, warning)| `<null>` |

## `enableBackground` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `enableBackground=(string)`| (changed)| `"a string"` |
| `enableBackground=(empty string)`| (changed)| `<empty string>` |
| `enableBackground=(array with string)`| (changed)| `"string"` |
| `enableBackground=(empty array)`| (changed)| `<empty string>` |
| `enableBackground=(object)`| (changed)| `"result of toString()"` |
| `enableBackground=(numeric string)`| (changed)| `"42"` |
| `enableBackground=(-1)`| (changed)| `"-1"` |
| `enableBackground=(0)`| (changed)| `"0"` |
| `enableBackground=(integer)`| (changed)| `"1"` |
| `enableBackground=(NaN)`| (changed, warning)| `"NaN"` |
| `enableBackground=(float)`| (changed)| `"99.99"` |
| `enableBackground=(true)`| (initial, warning)| `<null>` |
| `enableBackground=(false)`| (initial, warning)| `<null>` |
| `enableBackground=(string 'true')`| (changed)| `"true"` |
| `enableBackground=(string 'false')`| (changed)| `"false"` |
| `enableBackground=(string 'on')`| (changed)| `"on"` |
| `enableBackground=(string 'off')`| (changed)| `"off"` |
| `enableBackground=(symbol)`| (initial, warning)| `<null>` |
| `enableBackground=(function)`| (initial, warning)| `<null>` |
| `enableBackground=(null)`| (initial)| `<null>` |
| `enableBackground=(undefined)`| (initial)| `<null>` |

## `encType` (on `<form>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `encType=(string)`| (changed)| `"text/plain"` |
| `encType=(empty string)`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(array with string)`| (changed)| `"text/plain"` |
| `encType=(empty array)`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(object)`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(numeric string)`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(-1)`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(0)`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(integer)`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(NaN)`| (initial, warning)| `"application/x-www-form-urlencoded"` |
| `encType=(float)`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(true)`| (initial, warning)| `"application/x-www-form-urlencoded"` |
| `encType=(false)`| (initial, warning)| `"application/x-www-form-urlencoded"` |
| `encType=(string 'true')`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(string 'false')`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(string 'on')`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(string 'off')`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(symbol)`| (initial, warning)| `"application/x-www-form-urlencoded"` |
| `encType=(function)`| (initial, warning)| `"application/x-www-form-urlencoded"` |
| `encType=(null)`| (initial)| `"application/x-www-form-urlencoded"` |
| `encType=(undefined)`| (initial)| `"application/x-www-form-urlencoded"` |

## `end` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `end=(string)`| (changed)| `"a string"` |
| `end=(empty string)`| (changed)| `<empty string>` |
| `end=(array with string)`| (changed)| `"string"` |
| `end=(empty array)`| (changed)| `<empty string>` |
| `end=(object)`| (changed)| `"result of toString()"` |
| `end=(numeric string)`| (changed)| `"42"` |
| `end=(-1)`| (changed)| `"-1"` |
| `end=(0)`| (changed)| `"0"` |
| `end=(integer)`| (changed)| `"1"` |
| `end=(NaN)`| (changed, warning)| `"NaN"` |
| `end=(float)`| (changed)| `"99.99"` |
| `end=(true)`| (initial, warning)| `<null>` |
| `end=(false)`| (initial, warning)| `<null>` |
| `end=(string 'true')`| (changed)| `"true"` |
| `end=(string 'false')`| (changed)| `"false"` |
| `end=(string 'on')`| (changed)| `"on"` |
| `end=(string 'off')`| (changed)| `"off"` |
| `end=(symbol)`| (initial, warning)| `<null>` |
| `end=(function)`| (initial, warning)| `<null>` |
| `end=(null)`| (initial)| `<null>` |
| `end=(undefined)`| (initial)| `<null>` |

## `enterKeyHint` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `enterKeyHint=(string)`| (initial)| `<empty string>` |
| `enterKeyHint=(empty string)`| (initial)| `<empty string>` |
| `enterKeyHint=(array with string)`| (initial)| `<empty string>` |
| `enterKeyHint=(empty array)`| (initial)| `<empty string>` |
| `enterKeyHint=(object)`| (initial)| `<empty string>` |
| `enterKeyHint=(numeric string)`| (initial)| `<empty string>` |
| `enterKeyHint=(-1)`| (initial)| `<empty string>` |
| `enterKeyHint=(0)`| (initial)| `<empty string>` |
| `enterKeyHint=(integer)`| (initial)| `<empty string>` |
| `enterKeyHint=(NaN)`| (initial, warning)| `<empty string>` |
| `enterKeyHint=(float)`| (initial)| `<empty string>` |
| `enterKeyHint=(true)`| (initial, warning)| `<empty string>` |
| `enterKeyHint=(false)`| (initial, warning)| `<empty string>` |
| `enterKeyHint=(string 'true')`| (initial)| `<empty string>` |
| `enterKeyHint=(string 'false')`| (initial)| `<empty string>` |
| `enterKeyHint=(string 'on')`| (initial)| `<empty string>` |
| `enterKeyHint=(string 'off')`| (initial)| `<empty string>` |
| `enterKeyHint=(symbol)`| (initial, warning)| `<empty string>` |
| `enterKeyHint=(function)`| (initial, warning)| `<empty string>` |
| `enterKeyHint=(null)`| (initial)| `<empty string>` |
| `enterKeyHint=(undefined)`| (initial)| `<empty string>` |

## `exponent` (on `<feFuncA>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `exponent=(string)`| (initial)| `<number: 1>` |
| `exponent=(empty string)`| (changed)| `<number: 0>` |
| `exponent=(array with string)`| (initial)| `<number: 1>` |
| `exponent=(empty array)`| (changed)| `<number: 0>` |
| `exponent=(object)`| (initial)| `<number: 1>` |
| `exponent=(numeric string)`| (changed)| `<number: 42>` |
| `exponent=(-1)`| (changed)| `<number: -1>` |
| `exponent=(0)`| (changed)| `<number: 0>` |
| `exponent=(integer)`| (initial)| `<number: 1>` |
| `exponent=(NaN)`| (initial, warning)| `<number: 1>` |
| `exponent=(float)`| (changed)| `<number: 99.98999786376953>` |
| `exponent=(true)`| (initial, warning)| `<number: 1>` |
| `exponent=(false)`| (initial, warning)| `<number: 1>` |
| `exponent=(string 'true')`| (initial)| `<number: 1>` |
| `exponent=(string 'false')`| (initial)| `<number: 1>` |
| `exponent=(string 'on')`| (initial)| `<number: 1>` |
| `exponent=(string 'off')`| (initial)| `<number: 1>` |
| `exponent=(symbol)`| (initial, warning)| `<number: 1>` |
| `exponent=(function)`| (initial, warning)| `<number: 1>` |
| `exponent=(null)`| (initial)| `<number: 1>` |
| `exponent=(undefined)`| (initial)| `<number: 1>` |

## `externalResourcesRequired` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `externalResourcesRequired=(string)`| (changed, ssr mismatch)| `"a string"` |
| `externalResourcesRequired=(empty string)`| (changed, ssr mismatch)| `<empty string>` |
| `externalResourcesRequired=(array with string)`| (changed, ssr mismatch)| `"string"` |
| `externalResourcesRequired=(empty array)`| (changed, ssr mismatch)| `<empty string>` |
| `externalResourcesRequired=(object)`| (changed, ssr mismatch)| `"result of toString()"` |
| `externalResourcesRequired=(numeric string)`| (changed, ssr mismatch)| `"42"` |
| `externalResourcesRequired=(-1)`| (changed, ssr mismatch)| `"-1"` |
| `externalResourcesRequired=(0)`| (changed, ssr mismatch)| `"0"` |
| `externalResourcesRequired=(integer)`| (changed, ssr mismatch)| `"1"` |
| `externalResourcesRequired=(NaN)`| (changed, warning, ssr mismatch)| `"NaN"` |
| `externalResourcesRequired=(float)`| (changed, ssr mismatch)| `"99.99"` |
| `externalResourcesRequired=(true)`| (changed, ssr mismatch)| `"true"` |
| `externalResourcesRequired=(false)`| (changed, ssr mismatch)| `"false"` |
| `externalResourcesRequired=(string 'true')`| (changed, ssr mismatch)| `"true"` |
| `externalResourcesRequired=(string 'false')`| (changed, ssr mismatch)| `"false"` |
| `externalResourcesRequired=(string 'on')`| (changed, ssr mismatch)| `"on"` |
| `externalResourcesRequired=(string 'off')`| (changed, ssr mismatch)| `"off"` |
| `externalResourcesRequired=(symbol)`| (initial, warning)| `<null>` |
| `externalResourcesRequired=(function)`| (initial, warning)| `<null>` |
| `externalResourcesRequired=(null)`| (initial)| `<null>` |
| `externalResourcesRequired=(undefined)`| (initial)| `<null>` |

## `fetchPriority` (on `<img>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fetchPriority=(string)`| (changed)| `"high"` |
| `fetchPriority=(empty string)`| (initial)| `"auto"` |
| `fetchPriority=(array with string)`| (changed)| `"high"` |
| `fetchPriority=(empty array)`| (initial)| `"auto"` |
| `fetchPriority=(object)`| (initial)| `"auto"` |
| `fetchPriority=(numeric string)`| (initial)| `"auto"` |
| `fetchPriority=(-1)`| (initial)| `"auto"` |
| `fetchPriority=(0)`| (initial)| `"auto"` |
| `fetchPriority=(integer)`| (initial)| `"auto"` |
| `fetchPriority=(NaN)`| (initial, warning)| `"auto"` |
| `fetchPriority=(float)`| (initial)| `"auto"` |
| `fetchPriority=(true)`| (initial, warning)| `"auto"` |
| `fetchPriority=(false)`| (initial, warning)| `"auto"` |
| `fetchPriority=(string 'true')`| (initial)| `"auto"` |
| `fetchPriority=(string 'false')`| (initial)| `"auto"` |
| `fetchPriority=(string 'on')`| (initial)| `"auto"` |
| `fetchPriority=(string 'off')`| (initial)| `"auto"` |
| `fetchPriority=(symbol)`| (initial, warning)| `"auto"` |
| `fetchPriority=(function)`| (initial, warning)| `"auto"` |
| `fetchPriority=(null)`| (initial)| `"auto"` |
| `fetchPriority=(undefined)`| (initial)| `"auto"` |

## `fetchpriority` (on `<img>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fetchpriority=(string)`| (changed, warning)| `"high"` |
| `fetchpriority=(empty string)`| (initial, warning)| `"auto"` |
| `fetchpriority=(array with string)`| (changed, warning)| `"high"` |
| `fetchpriority=(empty array)`| (initial, warning)| `"auto"` |
| `fetchpriority=(object)`| (initial, warning)| `"auto"` |
| `fetchpriority=(numeric string)`| (initial, warning)| `"auto"` |
| `fetchpriority=(-1)`| (initial, warning)| `"auto"` |
| `fetchpriority=(0)`| (initial, warning)| `"auto"` |
| `fetchpriority=(integer)`| (initial, warning)| `"auto"` |
| `fetchpriority=(NaN)`| (initial, warning)| `"auto"` |
| `fetchpriority=(float)`| (initial, warning)| `"auto"` |
| `fetchpriority=(true)`| (initial, warning)| `"auto"` |
| `fetchpriority=(false)`| (initial, warning)| `"auto"` |
| `fetchpriority=(string 'true')`| (initial, warning)| `"auto"` |
| `fetchpriority=(string 'false')`| (initial, warning)| `"auto"` |
| `fetchpriority=(string 'on')`| (initial, warning)| `"auto"` |
| `fetchpriority=(string 'off')`| (initial, warning)| `"auto"` |
| `fetchpriority=(symbol)`| (initial, warning)| `"auto"` |
| `fetchpriority=(function)`| (initial, warning)| `"auto"` |
| `fetchpriority=(null)`| (initial, warning)| `"auto"` |
| `fetchpriority=(undefined)`| (initial, warning)| `"auto"` |

## `fetchPriority` (on `<link>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fetchPriority=(string)`| (changed)| `"high"` |
| `fetchPriority=(empty string)`| (initial)| `"auto"` |
| `fetchPriority=(array with string)`| (changed)| `"high"` |
| `fetchPriority=(empty array)`| (initial)| `"auto"` |
| `fetchPriority=(object)`| (initial)| `"auto"` |
| `fetchPriority=(numeric string)`| (initial)| `"auto"` |
| `fetchPriority=(-1)`| (initial)| `"auto"` |
| `fetchPriority=(0)`| (initial)| `"auto"` |
| `fetchPriority=(integer)`| (initial)| `"auto"` |
| `fetchPriority=(NaN)`| (initial, warning)| `"auto"` |
| `fetchPriority=(float)`| (initial)| `"auto"` |
| `fetchPriority=(true)`| (initial, warning)| `"auto"` |
| `fetchPriority=(false)`| (initial, warning)| `"auto"` |
| `fetchPriority=(string 'true')`| (initial)| `"auto"` |
| `fetchPriority=(string 'false')`| (initial)| `"auto"` |
| `fetchPriority=(string 'on')`| (initial)| `"auto"` |
| `fetchPriority=(string 'off')`| (initial)| `"auto"` |
| `fetchPriority=(symbol)`| (initial, warning)| `"auto"` |
| `fetchPriority=(function)`| (initial, warning)| `"auto"` |
| `fetchPriority=(null)`| (initial)| `"auto"` |
| `fetchPriority=(undefined)`| (initial)| `"auto"` |

## `fill` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fill=(string)`| (changed)| `"a string"` |
| `fill=(empty string)`| (changed)| `<empty string>` |
| `fill=(array with string)`| (changed)| `"string"` |
| `fill=(empty array)`| (changed)| `<empty string>` |
| `fill=(object)`| (changed)| `"result of toString()"` |
| `fill=(numeric string)`| (changed)| `"42"` |
| `fill=(-1)`| (changed)| `"-1"` |
| `fill=(0)`| (changed)| `"0"` |
| `fill=(integer)`| (changed)| `"1"` |
| `fill=(NaN)`| (changed, warning)| `"NaN"` |
| `fill=(float)`| (changed)| `"99.99"` |
| `fill=(true)`| (initial, warning)| `<null>` |
| `fill=(false)`| (initial, warning)| `<null>` |
| `fill=(string 'true')`| (changed)| `"true"` |
| `fill=(string 'false')`| (changed)| `"false"` |
| `fill=(string 'on')`| (changed)| `"on"` |
| `fill=(string 'off')`| (changed)| `"off"` |
| `fill=(symbol)`| (initial, warning)| `<null>` |
| `fill=(function)`| (initial, warning)| `<null>` |
| `fill=(null)`| (initial)| `<null>` |
| `fill=(undefined)`| (initial)| `<null>` |

## `fillOpacity` (on `<circle>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fillOpacity=(string)`| (changed)| `"a string"` |
| `fillOpacity=(empty string)`| (changed)| `<empty string>` |
| `fillOpacity=(array with string)`| (changed)| `"string"` |
| `fillOpacity=(empty array)`| (changed)| `<empty string>` |
| `fillOpacity=(object)`| (changed)| `"result of toString()"` |
| `fillOpacity=(numeric string)`| (changed)| `"42"` |
| `fillOpacity=(-1)`| (changed)| `"-1"` |
| `fillOpacity=(0)`| (changed)| `"0"` |
| `fillOpacity=(integer)`| (changed)| `"1"` |
| `fillOpacity=(NaN)`| (changed, warning)| `"NaN"` |
| `fillOpacity=(float)`| (changed)| `"99.99"` |
| `fillOpacity=(true)`| (initial, warning)| `<null>` |
| `fillOpacity=(false)`| (initial, warning)| `<null>` |
| `fillOpacity=(string 'true')`| (changed)| `"true"` |
| `fillOpacity=(string 'false')`| (changed)| `"false"` |
| `fillOpacity=(string 'on')`| (changed)| `"on"` |
| `fillOpacity=(string 'off')`| (changed)| `"off"` |
| `fillOpacity=(symbol)`| (initial, warning)| `<null>` |
| `fillOpacity=(function)`| (initial, warning)| `<null>` |
| `fillOpacity=(null)`| (initial)| `<null>` |
| `fillOpacity=(undefined)`| (initial)| `<null>` |

## `fill-opacity` (on `<circle>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fill-opacity=(string)`| (changed, warning)| `"a string"` |
| `fill-opacity=(empty string)`| (changed, warning)| `<empty string>` |
| `fill-opacity=(array with string)`| (changed, warning)| `"string"` |
| `fill-opacity=(empty array)`| (changed, warning)| `<empty string>` |
| `fill-opacity=(object)`| (changed, warning)| `"result of toString()"` |
| `fill-opacity=(numeric string)`| (changed, warning)| `"42"` |
| `fill-opacity=(-1)`| (changed, warning)| `"-1"` |
| `fill-opacity=(0)`| (changed, warning)| `"0"` |
| `fill-opacity=(integer)`| (changed, warning)| `"1"` |
| `fill-opacity=(NaN)`| (changed, warning)| `"NaN"` |
| `fill-opacity=(float)`| (changed, warning)| `"99.99"` |
| `fill-opacity=(true)`| (initial, warning)| `<null>` |
| `fill-opacity=(false)`| (initial, warning)| `<null>` |
| `fill-opacity=(string 'true')`| (changed, warning)| `"true"` |
| `fill-opacity=(string 'false')`| (changed, warning)| `"false"` |
| `fill-opacity=(string 'on')`| (changed, warning)| `"on"` |
| `fill-opacity=(string 'off')`| (changed, warning)| `"off"` |
| `fill-opacity=(symbol)`| (initial, warning)| `<null>` |
| `fill-opacity=(function)`| (initial, warning)| `<null>` |
| `fill-opacity=(null)`| (initial, warning)| `<null>` |
| `fill-opacity=(undefined)`| (initial, warning)| `<null>` |

## `fillRule` (on `<circle>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fillRule=(string)`| (changed)| `"a string"` |
| `fillRule=(empty string)`| (changed)| `<empty string>` |
| `fillRule=(array with string)`| (changed)| `"string"` |
| `fillRule=(empty array)`| (changed)| `<empty string>` |
| `fillRule=(object)`| (changed)| `"result of toString()"` |
| `fillRule=(numeric string)`| (changed)| `"42"` |
| `fillRule=(-1)`| (changed)| `"-1"` |
| `fillRule=(0)`| (changed)| `"0"` |
| `fillRule=(integer)`| (changed)| `"1"` |
| `fillRule=(NaN)`| (changed, warning)| `"NaN"` |
| `fillRule=(float)`| (changed)| `"99.99"` |
| `fillRule=(true)`| (initial, warning)| `<null>` |
| `fillRule=(false)`| (initial, warning)| `<null>` |
| `fillRule=(string 'true')`| (changed)| `"true"` |
| `fillRule=(string 'false')`| (changed)| `"false"` |
| `fillRule=(string 'on')`| (changed)| `"on"` |
| `fillRule=(string 'off')`| (changed)| `"off"` |
| `fillRule=(symbol)`| (initial, warning)| `<null>` |
| `fillRule=(function)`| (initial, warning)| `<null>` |
| `fillRule=(null)`| (initial)| `<null>` |
| `fillRule=(undefined)`| (initial)| `<null>` |

## `fill-rule` (on `<circle>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fill-rule=(string)`| (changed, warning)| `"a string"` |
| `fill-rule=(empty string)`| (changed, warning)| `<empty string>` |
| `fill-rule=(array with string)`| (changed, warning)| `"string"` |
| `fill-rule=(empty array)`| (changed, warning)| `<empty string>` |
| `fill-rule=(object)`| (changed, warning)| `"result of toString()"` |
| `fill-rule=(numeric string)`| (changed, warning)| `"42"` |
| `fill-rule=(-1)`| (changed, warning)| `"-1"` |
| `fill-rule=(0)`| (changed, warning)| `"0"` |
| `fill-rule=(integer)`| (changed, warning)| `"1"` |
| `fill-rule=(NaN)`| (changed, warning)| `"NaN"` |
| `fill-rule=(float)`| (changed, warning)| `"99.99"` |
| `fill-rule=(true)`| (initial, warning)| `<null>` |
| `fill-rule=(false)`| (initial, warning)| `<null>` |
| `fill-rule=(string 'true')`| (changed, warning)| `"true"` |
| `fill-rule=(string 'false')`| (changed, warning)| `"false"` |
| `fill-rule=(string 'on')`| (changed, warning)| `"on"` |
| `fill-rule=(string 'off')`| (changed, warning)| `"off"` |
| `fill-rule=(symbol)`| (initial, warning)| `<null>` |
| `fill-rule=(function)`| (initial, warning)| `<null>` |
| `fill-rule=(null)`| (initial, warning)| `<null>` |
| `fill-rule=(undefined)`| (initial, warning)| `<null>` |

## `filter` (on `<g>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `filter=(string)`| (changed)| `"a string"` |
| `filter=(empty string)`| (changed)| `<empty string>` |
| `filter=(array with string)`| (changed)| `"string"` |
| `filter=(empty array)`| (changed)| `<empty string>` |
| `filter=(object)`| (changed)| `"result of toString()"` |
| `filter=(numeric string)`| (changed)| `"42"` |
| `filter=(-1)`| (changed)| `"-1"` |
| `filter=(0)`| (changed)| `"0"` |
| `filter=(integer)`| (changed)| `"1"` |
| `filter=(NaN)`| (changed, warning)| `"NaN"` |
| `filter=(float)`| (changed)| `"99.99"` |
| `filter=(true)`| (initial, warning)| `<null>` |
| `filter=(false)`| (initial, warning)| `<null>` |
| `filter=(string 'true')`| (changed)| `"true"` |
| `filter=(string 'false')`| (changed)| `"false"` |
| `filter=(string 'on')`| (changed)| `"on"` |
| `filter=(string 'off')`| (changed)| `"off"` |
| `filter=(symbol)`| (initial, warning)| `<null>` |
| `filter=(function)`| (initial, warning)| `<null>` |
| `filter=(null)`| (initial)| `<null>` |
| `filter=(undefined)`| (initial)| `<null>` |

## `filterRes` (on `<filter>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `filterRes=(string)`| (changed, ssr mismatch)| `"a string"` |
| `filterRes=(empty string)`| (changed, ssr mismatch)| `<empty string>` |
| `filterRes=(array with string)`| (changed, ssr mismatch)| `"string"` |
| `filterRes=(empty array)`| (changed, ssr mismatch)| `<empty string>` |
| `filterRes=(object)`| (changed, ssr mismatch)| `"result of toString()"` |
| `filterRes=(numeric string)`| (changed, ssr mismatch)| `"42"` |
| `filterRes=(-1)`| (changed, ssr mismatch)| `"-1"` |
| `filterRes=(0)`| (changed, ssr mismatch)| `"0"` |
| `filterRes=(integer)`| (changed, ssr mismatch)| `"1"` |
| `filterRes=(NaN)`| (changed, warning, ssr mismatch)| `"NaN"` |
| `filterRes=(float)`| (changed, ssr mismatch)| `"99.99"` |
| `filterRes=(true)`| (initial, warning)| `<null>` |
| `filterRes=(false)`| (initial, warning)| `<null>` |
| `filterRes=(string 'true')`| (changed, ssr mismatch)| `"true"` |
| `filterRes=(string 'false')`| (changed, ssr mismatch)| `"false"` |
| `filterRes=(string 'on')`| (changed, ssr mismatch)| `"on"` |
| `filterRes=(string 'off')`| (changed, ssr mismatch)| `"off"` |
| `filterRes=(symbol)`| (initial, warning)| `<null>` |
| `filterRes=(function)`| (initial, warning)| `<null>` |
| `filterRes=(null)`| (initial)| `<null>` |
| `filterRes=(undefined)`| (initial)| `<null>` |

## `filterUnits` (on `<filter>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `filterUnits=(string)`| (changed)| `<number: 1>` |
| `filterUnits=(empty string)`| (initial)| `<number: 2>` |
| `filterUnits=(array with string)`| (changed)| `<number: 1>` |
| `filterUnits=(empty array)`| (initial)| `<number: 2>` |
| `filterUnits=(object)`| (initial)| `<number: 2>` |
| `filterUnits=(numeric string)`| (initial)| `<number: 2>` |
| `filterUnits=(-1)`| (initial)| `<number: 2>` |
| `filterUnits=(0)`| (initial)| `<number: 2>` |
| `filterUnits=(integer)`| (initial)| `<number: 2>` |
| `filterUnits=(NaN)`| (initial, warning)| `<number: 2>` |
| `filterUnits=(float)`| (initial)| `<number: 2>` |
| `filterUnits=(true)`| (initial, warning)| `<number: 2>` |
| `filterUnits=(false)`| (initial, warning)| `<number: 2>` |
| `filterUnits=(string 'true')`| (initial)| `<number: 2>` |
| `filterUnits=(string 'false')`| (initial)| `<number: 2>` |
| `filterUnits=(string 'on')`| (initial)| `<number: 2>` |
| `filterUnits=(string 'off')`| (initial)| `<number: 2>` |
| `filterUnits=(symbol)`| (initial, warning)| `<number: 2>` |
| `filterUnits=(function)`| (initial, warning)| `<number: 2>` |
| `filterUnits=(null)`| (initial)| `<number: 2>` |
| `filterUnits=(undefined)`| (initial)| `<number: 2>` |

## `flood-color` (on `<feflood>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `flood-color=(string)`| (changed, warning)| `"currentColor"` |
| `flood-color=(empty string)`| (changed, warning)| `<empty string>` |
| `flood-color=(array with string)`| (changed, warning)| `"currentColor"` |
| `flood-color=(empty array)`| (changed, warning)| `<empty string>` |
| `flood-color=(object)`| (changed, warning)| `"result of toString()"` |
| `flood-color=(numeric string)`| (changed, warning)| `"42"` |
| `flood-color=(-1)`| (changed, warning)| `"-1"` |
| `flood-color=(0)`| (changed, warning)| `"0"` |
| `flood-color=(integer)`| (changed, warning)| `"1"` |
| `flood-color=(NaN)`| (changed, warning)| `"NaN"` |
| `flood-color=(float)`| (changed, warning)| `"99.99"` |
| `flood-color=(true)`| (initial, warning)| `<null>` |
| `flood-color=(false)`| (initial, warning)| `<null>` |
| `flood-color=(string 'true')`| (changed, warning)| `"true"` |
| `flood-color=(string 'false')`| (changed, warning)| `"false"` |
| `flood-color=(string 'on')`| (changed, warning)| `"on"` |
| `flood-color=(string 'off')`| (changed, warning)| `"off"` |
| `flood-color=(symbol)`| (initial, warning)| `<null>` |
| `flood-color=(function)`| (initial, warning)| `<null>` |
| `flood-color=(null)`| (initial, warning)| `<null>` |
| `flood-color=(undefined)`| (initial, warning)| `<null>` |

## `floodColor` (on `<feflood>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `floodColor=(string)`| (changed)| `"currentColor"` |
| `floodColor=(empty string)`| (changed)| `<empty string>` |
| `floodColor=(array with string)`| (changed)| `"currentColor"` |
| `floodColor=(empty array)`| (changed)| `<empty string>` |
| `floodColor=(object)`| (changed)| `"result of toString()"` |
| `floodColor=(numeric string)`| (changed)| `"42"` |
| `floodColor=(-1)`| (changed)| `"-1"` |
| `floodColor=(0)`| (changed)| `"0"` |
| `floodColor=(integer)`| (changed)| `"1"` |
| `floodColor=(NaN)`| (changed, warning)| `"NaN"` |
| `floodColor=(float)`| (changed)| `"99.99"` |
| `floodColor=(true)`| (initial, warning)| `<null>` |
| `floodColor=(false)`| (initial, warning)| `<null>` |
| `floodColor=(string 'true')`| (changed)| `"true"` |
| `floodColor=(string 'false')`| (changed)| `"false"` |
| `floodColor=(string 'on')`| (changed)| `"on"` |
| `floodColor=(string 'off')`| (changed)| `"off"` |
| `floodColor=(symbol)`| (initial, warning)| `<null>` |
| `floodColor=(function)`| (initial, warning)| `<null>` |
| `floodColor=(null)`| (initial)| `<null>` |
| `floodColor=(undefined)`| (initial)| `<null>` |

## `flood-opacity` (on `<feflood>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `flood-opacity=(string)`| (changed, warning)| `"inherit"` |
| `flood-opacity=(empty string)`| (changed, warning)| `<empty string>` |
| `flood-opacity=(array with string)`| (changed, warning)| `"inherit"` |
| `flood-opacity=(empty array)`| (changed, warning)| `<empty string>` |
| `flood-opacity=(object)`| (changed, warning)| `"result of toString()"` |
| `flood-opacity=(numeric string)`| (changed, warning)| `"42"` |
| `flood-opacity=(-1)`| (changed, warning)| `"-1"` |
| `flood-opacity=(0)`| (changed, warning)| `"0"` |
| `flood-opacity=(integer)`| (changed, warning)| `"1"` |
| `flood-opacity=(NaN)`| (changed, warning)| `"NaN"` |
| `flood-opacity=(float)`| (changed, warning)| `"99.99"` |
| `flood-opacity=(true)`| (initial, warning)| `<null>` |
| `flood-opacity=(false)`| (initial, warning)| `<null>` |
| `flood-opacity=(string 'true')`| (changed, warning)| `"true"` |
| `flood-opacity=(string 'false')`| (changed, warning)| `"false"` |
| `flood-opacity=(string 'on')`| (changed, warning)| `"on"` |
| `flood-opacity=(string 'off')`| (changed, warning)| `"off"` |
| `flood-opacity=(symbol)`| (initial, warning)| `<null>` |
| `flood-opacity=(function)`| (initial, warning)| `<null>` |
| `flood-opacity=(null)`| (initial, warning)| `<null>` |
| `flood-opacity=(undefined)`| (initial, warning)| `<null>` |

## `floodOpacity` (on `<feflood>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `floodOpacity=(string)`| (changed)| `"inherit"` |
| `floodOpacity=(empty string)`| (changed)| `<empty string>` |
| `floodOpacity=(array with string)`| (changed)| `"inherit"` |
| `floodOpacity=(empty array)`| (changed)| `<empty string>` |
| `floodOpacity=(object)`| (changed)| `"result of toString()"` |
| `floodOpacity=(numeric string)`| (changed)| `"42"` |
| `floodOpacity=(-1)`| (changed)| `"-1"` |
| `floodOpacity=(0)`| (changed)| `"0"` |
| `floodOpacity=(integer)`| (changed)| `"1"` |
| `floodOpacity=(NaN)`| (changed, warning)| `"NaN"` |
| `floodOpacity=(float)`| (changed)| `"99.99"` |
| `floodOpacity=(true)`| (initial, warning)| `<null>` |
| `floodOpacity=(false)`| (initial, warning)| `<null>` |
| `floodOpacity=(string 'true')`| (changed)| `"true"` |
| `floodOpacity=(string 'false')`| (changed)| `"false"` |
| `floodOpacity=(string 'on')`| (changed)| `"on"` |
| `floodOpacity=(string 'off')`| (changed)| `"off"` |
| `floodOpacity=(symbol)`| (initial, warning)| `<null>` |
| `floodOpacity=(function)`| (initial, warning)| `<null>` |
| `floodOpacity=(null)`| (initial)| `<null>` |
| `floodOpacity=(undefined)`| (initial)| `<null>` |

## `focusable` (on `<p>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `focusable=(string)`| (changed)| `"a string"` |
| `focusable=(empty string)`| (changed)| `<empty string>` |
| `focusable=(array with string)`| (changed)| `"string"` |
| `focusable=(empty array)`| (changed)| `<empty string>` |
| `focusable=(object)`| (changed)| `"result of toString()"` |
| `focusable=(numeric string)`| (changed)| `"42"` |
| `focusable=(-1)`| (changed)| `"-1"` |
| `focusable=(0)`| (changed)| `"0"` |
| `focusable=(integer)`| (changed)| `"1"` |
| `focusable=(NaN)`| (changed, warning)| `"NaN"` |
| `focusable=(float)`| (changed)| `"99.99"` |
| `focusable=(true)`| (changed)| `"true"` |
| `focusable=(false)`| (changed)| `"false"` |
| `focusable=(string 'true')`| (changed)| `"true"` |
| `focusable=(string 'false')`| (changed)| `"false"` |
| `focusable=(string 'on')`| (changed)| `"on"` |
| `focusable=(string 'off')`| (changed)| `"off"` |
| `focusable=(symbol)`| (initial, warning)| `<null>` |
| `focusable=(function)`| (initial, warning)| `<null>` |
| `focusable=(null)`| (initial)| `<null>` |
| `focusable=(undefined)`| (initial)| `<null>` |

## `font-family` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `font-family=(string)`| (changed, warning)| `"a string"` |
| `font-family=(empty string)`| (changed, warning)| `<empty string>` |
| `font-family=(array with string)`| (changed, warning)| `"string"` |
| `font-family=(empty array)`| (changed, warning)| `<empty string>` |
| `font-family=(object)`| (changed, warning)| `"result of toString()"` |
| `font-family=(numeric string)`| (changed, warning)| `"42"` |
| `font-family=(-1)`| (changed, warning)| `"-1"` |
| `font-family=(0)`| (changed, warning)| `"0"` |
| `font-family=(integer)`| (changed, warning)| `"1"` |
| `font-family=(NaN)`| (changed, warning)| `"NaN"` |
| `font-family=(float)`| (changed, warning)| `"99.99"` |
| `font-family=(true)`| (initial, warning)| `<null>` |
| `font-family=(false)`| (initial, warning)| `<null>` |
| `font-family=(string 'true')`| (changed, warning)| `"true"` |
| `font-family=(string 'false')`| (changed, warning)| `"false"` |
| `font-family=(string 'on')`| (changed, warning)| `"on"` |
| `font-family=(string 'off')`| (changed, warning)| `"off"` |
| `font-family=(symbol)`| (initial, warning)| `<null>` |
| `font-family=(function)`| (initial, warning)| `<null>` |
| `font-family=(null)`| (initial, warning)| `<null>` |
| `font-family=(undefined)`| (initial, warning)| `<null>` |

## `font-size` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `font-size=(string)`| (changed, warning)| `"a string"` |
| `font-size=(empty string)`| (changed, warning)| `<empty string>` |
| `font-size=(array with string)`| (changed, warning)| `"string"` |
| `font-size=(empty array)`| (changed, warning)| `<empty string>` |
| `font-size=(object)`| (changed, warning)| `"result of toString()"` |
| `font-size=(numeric string)`| (changed, warning)| `"42"` |
| `font-size=(-1)`| (changed, warning)| `"-1"` |
| `font-size=(0)`| (changed, warning)| `"0"` |
| `font-size=(integer)`| (changed, warning)| `"1"` |
| `font-size=(NaN)`| (changed, warning)| `"NaN"` |
| `font-size=(float)`| (changed, warning)| `"99.99"` |
| `font-size=(true)`| (initial, warning)| `<null>` |
| `font-size=(false)`| (initial, warning)| `<null>` |
| `font-size=(string 'true')`| (changed, warning)| `"true"` |
| `font-size=(string 'false')`| (changed, warning)| `"false"` |
| `font-size=(string 'on')`| (changed, warning)| `"on"` |
| `font-size=(string 'off')`| (changed, warning)| `"off"` |
| `font-size=(symbol)`| (initial, warning)| `<null>` |
| `font-size=(function)`| (initial, warning)| `<null>` |
| `font-size=(null)`| (initial, warning)| `<null>` |
| `font-size=(undefined)`| (initial, warning)| `<null>` |

## `font-size-adjust` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `font-size-adjust=(string)`| (changed, warning)| `"a string"` |
| `font-size-adjust=(empty string)`| (changed, warning)| `<empty string>` |
| `font-size-adjust=(array with string)`| (changed, warning)| `"string"` |
| `font-size-adjust=(empty array)`| (changed, warning)| `<empty string>` |
| `font-size-adjust=(object)`| (changed, warning)| `"result of toString()"` |
| `font-size-adjust=(numeric string)`| (changed, warning)| `"42"` |
| `font-size-adjust=(-1)`| (changed, warning)| `"-1"` |
| `font-size-adjust=(0)`| (changed, warning)| `"0"` |
| `font-size-adjust=(integer)`| (changed, warning)| `"1"` |
| `font-size-adjust=(NaN)`| (changed, warning)| `"NaN"` |
| `font-size-adjust=(float)`| (changed, warning)| `"99.99"` |
| `font-size-adjust=(true)`| (initial, warning)| `<null>` |
| `font-size-adjust=(false)`| (initial, warning)| `<null>` |
| `font-size-adjust=(string 'true')`| (changed, warning)| `"true"` |
| `font-size-adjust=(string 'false')`| (changed, warning)| `"false"` |
| `font-size-adjust=(string 'on')`| (changed, warning)| `"on"` |
| `font-size-adjust=(string 'off')`| (changed, warning)| `"off"` |
| `font-size-adjust=(symbol)`| (initial, warning)| `<null>` |
| `font-size-adjust=(function)`| (initial, warning)| `<null>` |
| `font-size-adjust=(null)`| (initial, warning)| `<null>` |
| `font-size-adjust=(undefined)`| (initial, warning)| `<null>` |

## `font-stretch` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `font-stretch=(string)`| (changed, warning)| `"a string"` |
| `font-stretch=(empty string)`| (changed, warning)| `<empty string>` |
| `font-stretch=(array with string)`| (changed, warning)| `"string"` |
| `font-stretch=(empty array)`| (changed, warning)| `<empty string>` |
| `font-stretch=(object)`| (changed, warning)| `"result of toString()"` |
| `font-stretch=(numeric string)`| (changed, warning)| `"42"` |
| `font-stretch=(-1)`| (changed, warning)| `"-1"` |
| `font-stretch=(0)`| (changed, warning)| `"0"` |
| `font-stretch=(integer)`| (changed, warning)| `"1"` |
| `font-stretch=(NaN)`| (changed, warning)| `"NaN"` |
| `font-stretch=(float)`| (changed, warning)| `"99.99"` |
| `font-stretch=(true)`| (initial, warning)| `<null>` |
| `font-stretch=(false)`| (initial, warning)| `<null>` |
| `font-stretch=(string 'true')`| (changed, warning)| `"true"` |
| `font-stretch=(string 'false')`| (changed, warning)| `"false"` |
| `font-stretch=(string 'on')`| (changed, warning)| `"on"` |
| `font-stretch=(string 'off')`| (changed, warning)| `"off"` |
| `font-stretch=(symbol)`| (initial, warning)| `<null>` |
| `font-stretch=(function)`| (initial, warning)| `<null>` |
| `font-stretch=(null)`| (initial, warning)| `<null>` |
| `font-stretch=(undefined)`| (initial, warning)| `<null>` |

## `font-style` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `font-style=(string)`| (changed, warning)| `"a string"` |
| `font-style=(empty string)`| (changed, warning)| `<empty string>` |
| `font-style=(array with string)`| (changed, warning)| `"string"` |
| `font-style=(empty array)`| (changed, warning)| `<empty string>` |
| `font-style=(object)`| (changed, warning)| `"result of toString()"` |
| `font-style=(numeric string)`| (changed, warning)| `"42"` |
| `font-style=(-1)`| (changed, warning)| `"-1"` |
| `font-style=(0)`| (changed, warning)| `"0"` |
| `font-style=(integer)`| (changed, warning)| `"1"` |
| `font-style=(NaN)`| (changed, warning)| `"NaN"` |
| `font-style=(float)`| (changed, warning)| `"99.99"` |
| `font-style=(true)`| (initial, warning)| `<null>` |
| `font-style=(false)`| (initial, warning)| `<null>` |
| `font-style=(string 'true')`| (changed, warning)| `"true"` |
| `font-style=(string 'false')`| (changed, warning)| `"false"` |
| `font-style=(string 'on')`| (changed, warning)| `"on"` |
| `font-style=(string 'off')`| (changed, warning)| `"off"` |
| `font-style=(symbol)`| (initial, warning)| `<null>` |
| `font-style=(function)`| (initial, warning)| `<null>` |
| `font-style=(null)`| (initial, warning)| `<null>` |
| `font-style=(undefined)`| (initial, warning)| `<null>` |

## `font-variant` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `font-variant=(string)`| (changed, warning)| `"a string"` |
| `font-variant=(empty string)`| (changed, warning)| `<empty string>` |
| `font-variant=(array with string)`| (changed, warning)| `"string"` |
| `font-variant=(empty array)`| (changed, warning)| `<empty string>` |
| `font-variant=(object)`| (changed, warning)| `"result of toString()"` |
| `font-variant=(numeric string)`| (changed, warning)| `"42"` |
| `font-variant=(-1)`| (changed, warning)| `"-1"` |
| `font-variant=(0)`| (changed, warning)| `"0"` |
| `font-variant=(integer)`| (changed, warning)| `"1"` |
| `font-variant=(NaN)`| (changed, warning)| `"NaN"` |
| `font-variant=(float)`| (changed, warning)| `"99.99"` |
| `font-variant=(true)`| (initial, warning)| `<null>` |
| `font-variant=(false)`| (initial, warning)| `<null>` |
| `font-variant=(string 'true')`| (changed, warning)| `"true"` |
| `font-variant=(string 'false')`| (changed, warning)| `"false"` |
| `font-variant=(string 'on')`| (changed, warning)| `"on"` |
| `font-variant=(string 'off')`| (changed, warning)| `"off"` |
| `font-variant=(symbol)`| (initial, warning)| `<null>` |
| `font-variant=(function)`| (initial, warning)| `<null>` |
| `font-variant=(null)`| (initial, warning)| `<null>` |
| `font-variant=(undefined)`| (initial, warning)| `<null>` |

## `font-weight` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `font-weight=(string)`| (changed, warning)| `"a string"` |
| `font-weight=(empty string)`| (changed, warning)| `<empty string>` |
| `font-weight=(array with string)`| (changed, warning)| `"string"` |
| `font-weight=(empty array)`| (changed, warning)| `<empty string>` |
| `font-weight=(object)`| (changed, warning)| `"result of toString()"` |
| `font-weight=(numeric string)`| (changed, warning)| `"42"` |
| `font-weight=(-1)`| (changed, warning)| `"-1"` |
| `font-weight=(0)`| (changed, warning)| `"0"` |
| `font-weight=(integer)`| (changed, warning)| `"1"` |
| `font-weight=(NaN)`| (changed, warning)| `"NaN"` |
| `font-weight=(float)`| (changed, warning)| `"99.99"` |
| `font-weight=(true)`| (initial, warning)| `<null>` |
| `font-weight=(false)`| (initial, warning)| `<null>` |
| `font-weight=(string 'true')`| (changed, warning)| `"true"` |
| `font-weight=(string 'false')`| (changed, warning)| `"false"` |
| `font-weight=(string 'on')`| (changed, warning)| `"on"` |
| `font-weight=(string 'off')`| (changed, warning)| `"off"` |
| `font-weight=(symbol)`| (initial, warning)| `<null>` |
| `font-weight=(function)`| (initial, warning)| `<null>` |
| `font-weight=(null)`| (initial, warning)| `<null>` |
| `font-weight=(undefined)`| (initial, warning)| `<null>` |

## `fontFamily` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fontFamily=(string)`| (changed)| `"a string"` |
| `fontFamily=(empty string)`| (changed)| `<empty string>` |
| `fontFamily=(array with string)`| (changed)| `"string"` |
| `fontFamily=(empty array)`| (changed)| `<empty string>` |
| `fontFamily=(object)`| (changed)| `"result of toString()"` |
| `fontFamily=(numeric string)`| (changed)| `"42"` |
| `fontFamily=(-1)`| (changed)| `"-1"` |
| `fontFamily=(0)`| (changed)| `"0"` |
| `fontFamily=(integer)`| (changed)| `"1"` |
| `fontFamily=(NaN)`| (changed, warning)| `"NaN"` |
| `fontFamily=(float)`| (changed)| `"99.99"` |
| `fontFamily=(true)`| (initial, warning)| `<null>` |
| `fontFamily=(false)`| (initial, warning)| `<null>` |
| `fontFamily=(string 'true')`| (changed)| `"true"` |
| `fontFamily=(string 'false')`| (changed)| `"false"` |
| `fontFamily=(string 'on')`| (changed)| `"on"` |
| `fontFamily=(string 'off')`| (changed)| `"off"` |
| `fontFamily=(symbol)`| (initial, warning)| `<null>` |
| `fontFamily=(function)`| (initial, warning)| `<null>` |
| `fontFamily=(null)`| (initial)| `<null>` |
| `fontFamily=(undefined)`| (initial)| `<null>` |

## `fontSize` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fontSize=(string)`| (changed)| `"a string"` |
| `fontSize=(empty string)`| (changed)| `<empty string>` |
| `fontSize=(array with string)`| (changed)| `"string"` |
| `fontSize=(empty array)`| (changed)| `<empty string>` |
| `fontSize=(object)`| (changed)| `"result of toString()"` |
| `fontSize=(numeric string)`| (changed)| `"42"` |
| `fontSize=(-1)`| (changed)| `"-1"` |
| `fontSize=(0)`| (changed)| `"0"` |
| `fontSize=(integer)`| (changed)| `"1"` |
| `fontSize=(NaN)`| (changed, warning)| `"NaN"` |
| `fontSize=(float)`| (changed)| `"99.99"` |
| `fontSize=(true)`| (initial, warning)| `<null>` |
| `fontSize=(false)`| (initial, warning)| `<null>` |
| `fontSize=(string 'true')`| (changed)| `"true"` |
| `fontSize=(string 'false')`| (changed)| `"false"` |
| `fontSize=(string 'on')`| (changed)| `"on"` |
| `fontSize=(string 'off')`| (changed)| `"off"` |
| `fontSize=(symbol)`| (initial, warning)| `<null>` |
| `fontSize=(function)`| (initial, warning)| `<null>` |
| `fontSize=(null)`| (initial)| `<null>` |
| `fontSize=(undefined)`| (initial)| `<null>` |

## `fontSizeAdjust` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fontSizeAdjust=(string)`| (changed)| `"a string"` |
| `fontSizeAdjust=(empty string)`| (changed)| `<empty string>` |
| `fontSizeAdjust=(array with string)`| (changed)| `"string"` |
| `fontSizeAdjust=(empty array)`| (changed)| `<empty string>` |
| `fontSizeAdjust=(object)`| (changed)| `"result of toString()"` |
| `fontSizeAdjust=(numeric string)`| (changed)| `"42"` |
| `fontSizeAdjust=(-1)`| (changed)| `"-1"` |
| `fontSizeAdjust=(0)`| (changed)| `"0"` |
| `fontSizeAdjust=(integer)`| (changed)| `"1"` |
| `fontSizeAdjust=(NaN)`| (changed, warning)| `"NaN"` |
| `fontSizeAdjust=(float)`| (changed)| `"99.99"` |
| `fontSizeAdjust=(true)`| (initial, warning)| `<null>` |
| `fontSizeAdjust=(false)`| (initial, warning)| `<null>` |
| `fontSizeAdjust=(string 'true')`| (changed)| `"true"` |
| `fontSizeAdjust=(string 'false')`| (changed)| `"false"` |
| `fontSizeAdjust=(string 'on')`| (changed)| `"on"` |
| `fontSizeAdjust=(string 'off')`| (changed)| `"off"` |
| `fontSizeAdjust=(symbol)`| (initial, warning)| `<null>` |
| `fontSizeAdjust=(function)`| (initial, warning)| `<null>` |
| `fontSizeAdjust=(null)`| (initial)| `<null>` |
| `fontSizeAdjust=(undefined)`| (initial)| `<null>` |

## `fontStretch` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fontStretch=(string)`| (changed)| `"a string"` |
| `fontStretch=(empty string)`| (changed)| `<empty string>` |
| `fontStretch=(array with string)`| (changed)| `"string"` |
| `fontStretch=(empty array)`| (changed)| `<empty string>` |
| `fontStretch=(object)`| (changed)| `"result of toString()"` |
| `fontStretch=(numeric string)`| (changed)| `"42"` |
| `fontStretch=(-1)`| (changed)| `"-1"` |
| `fontStretch=(0)`| (changed)| `"0"` |
| `fontStretch=(integer)`| (changed)| `"1"` |
| `fontStretch=(NaN)`| (changed, warning)| `"NaN"` |
| `fontStretch=(float)`| (changed)| `"99.99"` |
| `fontStretch=(true)`| (initial, warning)| `<null>` |
| `fontStretch=(false)`| (initial, warning)| `<null>` |
| `fontStretch=(string 'true')`| (changed)| `"true"` |
| `fontStretch=(string 'false')`| (changed)| `"false"` |
| `fontStretch=(string 'on')`| (changed)| `"on"` |
| `fontStretch=(string 'off')`| (changed)| `"off"` |
| `fontStretch=(symbol)`| (initial, warning)| `<null>` |
| `fontStretch=(function)`| (initial, warning)| `<null>` |
| `fontStretch=(null)`| (initial)| `<null>` |
| `fontStretch=(undefined)`| (initial)| `<null>` |

## `fontStyle` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fontStyle=(string)`| (changed)| `"a string"` |
| `fontStyle=(empty string)`| (changed)| `<empty string>` |
| `fontStyle=(array with string)`| (changed)| `"string"` |
| `fontStyle=(empty array)`| (changed)| `<empty string>` |
| `fontStyle=(object)`| (changed)| `"result of toString()"` |
| `fontStyle=(numeric string)`| (changed)| `"42"` |
| `fontStyle=(-1)`| (changed)| `"-1"` |
| `fontStyle=(0)`| (changed)| `"0"` |
| `fontStyle=(integer)`| (changed)| `"1"` |
| `fontStyle=(NaN)`| (changed, warning)| `"NaN"` |
| `fontStyle=(float)`| (changed)| `"99.99"` |
| `fontStyle=(true)`| (initial, warning)| `<null>` |
| `fontStyle=(false)`| (initial, warning)| `<null>` |
| `fontStyle=(string 'true')`| (changed)| `"true"` |
| `fontStyle=(string 'false')`| (changed)| `"false"` |
| `fontStyle=(string 'on')`| (changed)| `"on"` |
| `fontStyle=(string 'off')`| (changed)| `"off"` |
| `fontStyle=(symbol)`| (initial, warning)| `<null>` |
| `fontStyle=(function)`| (initial, warning)| `<null>` |
| `fontStyle=(null)`| (initial)| `<null>` |
| `fontStyle=(undefined)`| (initial)| `<null>` |

## `fontVariant` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fontVariant=(string)`| (changed)| `"a string"` |
| `fontVariant=(empty string)`| (changed)| `<empty string>` |
| `fontVariant=(array with string)`| (changed)| `"string"` |
| `fontVariant=(empty array)`| (changed)| `<empty string>` |
| `fontVariant=(object)`| (changed)| `"result of toString()"` |
| `fontVariant=(numeric string)`| (changed)| `"42"` |
| `fontVariant=(-1)`| (changed)| `"-1"` |
| `fontVariant=(0)`| (changed)| `"0"` |
| `fontVariant=(integer)`| (changed)| `"1"` |
| `fontVariant=(NaN)`| (changed, warning)| `"NaN"` |
| `fontVariant=(float)`| (changed)| `"99.99"` |
| `fontVariant=(true)`| (initial, warning)| `<null>` |
| `fontVariant=(false)`| (initial, warning)| `<null>` |
| `fontVariant=(string 'true')`| (changed)| `"true"` |
| `fontVariant=(string 'false')`| (changed)| `"false"` |
| `fontVariant=(string 'on')`| (changed)| `"on"` |
| `fontVariant=(string 'off')`| (changed)| `"off"` |
| `fontVariant=(symbol)`| (initial, warning)| `<null>` |
| `fontVariant=(function)`| (initial, warning)| `<null>` |
| `fontVariant=(null)`| (initial)| `<null>` |
| `fontVariant=(undefined)`| (initial)| `<null>` |

## `fontWeight` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fontWeight=(string)`| (changed)| `"a string"` |
| `fontWeight=(empty string)`| (changed)| `<empty string>` |
| `fontWeight=(array with string)`| (changed)| `"string"` |
| `fontWeight=(empty array)`| (changed)| `<empty string>` |
| `fontWeight=(object)`| (changed)| `"result of toString()"` |
| `fontWeight=(numeric string)`| (changed)| `"42"` |
| `fontWeight=(-1)`| (changed)| `"-1"` |
| `fontWeight=(0)`| (changed)| `"0"` |
| `fontWeight=(integer)`| (changed)| `"1"` |
| `fontWeight=(NaN)`| (changed, warning)| `"NaN"` |
| `fontWeight=(float)`| (changed)| `"99.99"` |
| `fontWeight=(true)`| (initial, warning)| `<null>` |
| `fontWeight=(false)`| (initial, warning)| `<null>` |
| `fontWeight=(string 'true')`| (changed)| `"true"` |
| `fontWeight=(string 'false')`| (changed)| `"false"` |
| `fontWeight=(string 'on')`| (changed)| `"on"` |
| `fontWeight=(string 'off')`| (changed)| `"off"` |
| `fontWeight=(symbol)`| (initial, warning)| `<null>` |
| `fontWeight=(function)`| (initial, warning)| `<null>` |
| `fontWeight=(null)`| (initial)| `<null>` |
| `fontWeight=(undefined)`| (initial)| `<null>` |

## `for` (on `<label>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `for=(string)`| (changed, warning)| `"a string"` |
| `for=(empty string)`| (initial, warning)| `<empty string>` |
| `for=(array with string)`| (changed, warning)| `"string"` |
| `for=(empty array)`| (initial, warning)| `<empty string>` |
| `for=(object)`| (changed, warning)| `"result of toString()"` |
| `for=(numeric string)`| (changed, warning)| `"42"` |
| `for=(-1)`| (changed, warning)| `"-1"` |
| `for=(0)`| (changed, warning)| `"0"` |
| `for=(integer)`| (changed, warning)| `"1"` |
| `for=(NaN)`| (changed, warning)| `"NaN"` |
| `for=(float)`| (changed, warning)| `"99.99"` |
| `for=(true)`| (initial, warning)| `<empty string>` |
| `for=(false)`| (initial, warning)| `<empty string>` |
| `for=(string 'true')`| (changed, warning)| `"true"` |
| `for=(string 'false')`| (changed, warning)| `"false"` |
| `for=(string 'on')`| (changed, warning)| `"on"` |
| `for=(string 'off')`| (changed, warning)| `"off"` |
| `for=(symbol)`| (initial, warning)| `<empty string>` |
| `for=(function)`| (initial, warning)| `<empty string>` |
| `for=(null)`| (initial, warning)| `<empty string>` |
| `for=(undefined)`| (initial, warning)| `<empty string>` |

## `fOr` (on `<label>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fOr=(string)`| (changed, warning)| `"a string"` |
| `fOr=(empty string)`| (initial, warning)| `<empty string>` |
| `fOr=(array with string)`| (changed, warning)| `"string"` |
| `fOr=(empty array)`| (initial, warning)| `<empty string>` |
| `fOr=(object)`| (changed, warning)| `"result of toString()"` |
| `fOr=(numeric string)`| (changed, warning)| `"42"` |
| `fOr=(-1)`| (changed, warning)| `"-1"` |
| `fOr=(0)`| (changed, warning)| `"0"` |
| `fOr=(integer)`| (changed, warning)| `"1"` |
| `fOr=(NaN)`| (changed, warning)| `"NaN"` |
| `fOr=(float)`| (changed, warning)| `"99.99"` |
| `fOr=(true)`| (initial, warning)| `<empty string>` |
| `fOr=(false)`| (initial, warning)| `<empty string>` |
| `fOr=(string 'true')`| (changed, warning)| `"true"` |
| `fOr=(string 'false')`| (changed, warning)| `"false"` |
| `fOr=(string 'on')`| (changed, warning)| `"on"` |
| `fOr=(string 'off')`| (changed, warning)| `"off"` |
| `fOr=(symbol)`| (initial, warning)| `<empty string>` |
| `fOr=(function)`| (initial, warning)| `<empty string>` |
| `fOr=(null)`| (initial, warning)| `<empty string>` |
| `fOr=(undefined)`| (initial, warning)| `<empty string>` |

## `form` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `form=(string)`| (changed)| `"a string"` |
| `form=(empty string)`| (changed)| `<empty string>` |
| `form=(array with string)`| (changed)| `"string"` |
| `form=(empty array)`| (changed)| `<empty string>` |
| `form=(object)`| (changed)| `"result of toString()"` |
| `form=(numeric string)`| (changed)| `"42"` |
| `form=(-1)`| (changed)| `"-1"` |
| `form=(0)`| (changed)| `"0"` |
| `form=(integer)`| (changed)| `"1"` |
| `form=(NaN)`| (changed, warning)| `"NaN"` |
| `form=(float)`| (changed)| `"99.99"` |
| `form=(true)`| (initial, warning)| `<null>` |
| `form=(false)`| (initial, warning)| `<null>` |
| `form=(string 'true')`| (changed)| `"true"` |
| `form=(string 'false')`| (changed)| `"false"` |
| `form=(string 'on')`| (changed)| `"on"` |
| `form=(string 'off')`| (changed)| `"off"` |
| `form=(symbol)`| (initial, warning)| `<null>` |
| `form=(function)`| (initial, warning)| `<null>` |
| `form=(null)`| (initial)| `<null>` |
| `form=(undefined)`| (initial)| `<null>` |

## `formAction` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `formAction=(string)`| (changed, warning)| `"https://reactjs.com/"` |
| `formAction=(empty string)`| (initial, warning)| `"http://localhost:3000/"` |
| `formAction=(array with string)`| (changed, warning)| `"https://reactjs.com/"` |
| `formAction=(empty array)`| (initial, warning)| `"http://localhost:3000/"` |
| `formAction=(object)`| (changed, warning)| `"http://localhost:3000/result%20of%20toString()"` |
| `formAction=(numeric string)`| (changed, warning)| `"http://localhost:3000/42"` |
| `formAction=(-1)`| (changed, warning)| `"http://localhost:3000/-1"` |
| `formAction=(0)`| (changed, warning)| `"http://localhost:3000/0"` |
| `formAction=(integer)`| (changed, warning)| `"http://localhost:3000/1"` |
| `formAction=(NaN)`| (changed, warning)| `"http://localhost:3000/NaN"` |
| `formAction=(float)`| (changed, warning)| `"http://localhost:3000/99.99"` |
| `formAction=(true)`| (initial, warning)| `"http://localhost:3000/"` |
| `formAction=(false)`| (initial, warning)| `"http://localhost:3000/"` |
| `formAction=(string 'true')`| (changed, warning)| `"http://localhost:3000/true"` |
| `formAction=(string 'false')`| (changed, warning)| `"http://localhost:3000/false"` |
| `formAction=(string 'on')`| (changed, warning)| `"http://localhost:3000/on"` |
| `formAction=(string 'off')`| (changed, warning)| `"http://localhost:3000/off"` |
| `formAction=(symbol)`| (initial, warning)| `"http://localhost:3000/"` |
| `formAction=(function)`| (changed, warning, ssr error, ssr mismatch)| `"javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"` |
| `formAction=(null)`| (initial)| `"http://localhost:3000/"` |
| `formAction=(undefined)`| (initial)| `"http://localhost:3000/"` |

## `format` (on `<altGlyph>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `format=(string)`| (changed)| `"a string"` |
| `format=(empty string)`| (changed)| `<empty string>` |
| `format=(array with string)`| (changed)| `"string"` |
| `format=(empty array)`| (changed)| `<empty string>` |
| `format=(object)`| (changed)| `"result of toString()"` |
| `format=(numeric string)`| (changed)| `"42"` |
| `format=(-1)`| (changed)| `"-1"` |
| `format=(0)`| (changed)| `"0"` |
| `format=(integer)`| (changed)| `"1"` |
| `format=(NaN)`| (changed, warning)| `"NaN"` |
| `format=(float)`| (changed)| `"99.99"` |
| `format=(true)`| (initial, warning)| `<null>` |
| `format=(false)`| (initial, warning)| `<null>` |
| `format=(string 'true')`| (changed)| `"true"` |
| `format=(string 'false')`| (changed)| `"false"` |
| `format=(string 'on')`| (changed)| `"on"` |
| `format=(string 'off')`| (changed)| `"off"` |
| `format=(symbol)`| (initial, warning)| `<null>` |
| `format=(function)`| (initial, warning)| `<null>` |
| `format=(null)`| (initial)| `<null>` |
| `format=(undefined)`| (initial)| `<null>` |

## `formEncType` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `formEncType=(string)`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(empty string)`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(array with string)`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(empty array)`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(object)`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(numeric string)`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(-1)`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(0)`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(integer)`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(NaN)`| (changed, warning)| `"application/x-www-form-urlencoded"` |
| `formEncType=(float)`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(true)`| (initial, warning)| `<empty string>` |
| `formEncType=(false)`| (initial, warning)| `<empty string>` |
| `formEncType=(string 'true')`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(string 'false')`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(string 'on')`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(string 'off')`| (changed)| `"application/x-www-form-urlencoded"` |
| `formEncType=(symbol)`| (initial, warning)| `<empty string>` |
| `formEncType=(function)`| (initial, warning)| `<empty string>` |
| `formEncType=(null)`| (initial)| `<empty string>` |
| `formEncType=(undefined)`| (initial)| `<empty string>` |

## `formMethod` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `formMethod=(string)`| (changed)| `"post"` |
| `formMethod=(empty string)`| (changed)| `"get"` |
| `formMethod=(array with string)`| (changed)| `"post"` |
| `formMethod=(empty array)`| (changed)| `"get"` |
| `formMethod=(object)`| (changed)| `"get"` |
| `formMethod=(numeric string)`| (changed)| `"get"` |
| `formMethod=(-1)`| (changed)| `"get"` |
| `formMethod=(0)`| (changed)| `"get"` |
| `formMethod=(integer)`| (changed)| `"get"` |
| `formMethod=(NaN)`| (changed, warning)| `"get"` |
| `formMethod=(float)`| (changed)| `"get"` |
| `formMethod=(true)`| (initial, warning)| `<empty string>` |
| `formMethod=(false)`| (initial, warning)| `<empty string>` |
| `formMethod=(string 'true')`| (changed)| `"get"` |
| `formMethod=(string 'false')`| (changed)| `"get"` |
| `formMethod=(string 'on')`| (changed)| `"get"` |
| `formMethod=(string 'off')`| (changed)| `"get"` |
| `formMethod=(symbol)`| (initial, warning)| `<empty string>` |
| `formMethod=(function)`| (initial, warning)| `<empty string>` |
| `formMethod=(null)`| (initial)| `<empty string>` |
| `formMethod=(undefined)`| (initial)| `<empty string>` |

## `formNoValidate` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `formNoValidate=(string)`| (changed)| `<boolean: true>` |
| `formNoValidate=(empty string)`| (initial)| `<boolean: false>` |
| `formNoValidate=(array with string)`| (changed)| `<boolean: true>` |
| `formNoValidate=(empty array)`| (changed)| `<boolean: true>` |
| `formNoValidate=(object)`| (changed)| `<boolean: true>` |
| `formNoValidate=(numeric string)`| (changed)| `<boolean: true>` |
| `formNoValidate=(-1)`| (changed)| `<boolean: true>` |
| `formNoValidate=(0)`| (initial)| `<boolean: false>` |
| `formNoValidate=(integer)`| (changed)| `<boolean: true>` |
| `formNoValidate=(NaN)`| (initial, warning)| `<boolean: false>` |
| `formNoValidate=(float)`| (changed)| `<boolean: true>` |
| `formNoValidate=(true)`| (changed)| `<boolean: true>` |
| `formNoValidate=(false)`| (initial)| `<boolean: false>` |
| `formNoValidate=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `formNoValidate=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `formNoValidate=(string 'on')`| (changed)| `<boolean: true>` |
| `formNoValidate=(string 'off')`| (changed)| `<boolean: true>` |
| `formNoValidate=(symbol)`| (initial, warning)| `<boolean: false>` |
| `formNoValidate=(function)`| (initial, warning)| `<boolean: false>` |
| `formNoValidate=(null)`| (initial)| `<boolean: false>` |
| `formNoValidate=(undefined)`| (initial)| `<boolean: false>` |

## `formTarget` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `formTarget=(string)`| (changed)| `"a string"` |
| `formTarget=(empty string)`| (initial)| `<empty string>` |
| `formTarget=(array with string)`| (changed)| `"string"` |
| `formTarget=(empty array)`| (initial)| `<empty string>` |
| `formTarget=(object)`| (changed)| `"result of toString()"` |
| `formTarget=(numeric string)`| (changed)| `"42"` |
| `formTarget=(-1)`| (changed)| `"-1"` |
| `formTarget=(0)`| (changed)| `"0"` |
| `formTarget=(integer)`| (changed)| `"1"` |
| `formTarget=(NaN)`| (changed, warning)| `"NaN"` |
| `formTarget=(float)`| (changed)| `"99.99"` |
| `formTarget=(true)`| (initial, warning)| `<empty string>` |
| `formTarget=(false)`| (initial, warning)| `<empty string>` |
| `formTarget=(string 'true')`| (changed)| `"true"` |
| `formTarget=(string 'false')`| (changed)| `"false"` |
| `formTarget=(string 'on')`| (changed)| `"on"` |
| `formTarget=(string 'off')`| (changed)| `"off"` |
| `formTarget=(symbol)`| (initial, warning)| `<empty string>` |
| `formTarget=(function)`| (initial, warning)| `<empty string>` |
| `formTarget=(null)`| (initial)| `<empty string>` |
| `formTarget=(undefined)`| (initial)| `<empty string>` |

## `frameBorder` (on `<iframe>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `frameBorder=(string)`| (changed)| `"a string"` |
| `frameBorder=(empty string)`| (initial)| `<empty string>` |
| `frameBorder=(array with string)`| (changed)| `"string"` |
| `frameBorder=(empty array)`| (initial)| `<empty string>` |
| `frameBorder=(object)`| (changed)| `"result of toString()"` |
| `frameBorder=(numeric string)`| (changed)| `"42"` |
| `frameBorder=(-1)`| (changed)| `"-1"` |
| `frameBorder=(0)`| (changed)| `"0"` |
| `frameBorder=(integer)`| (changed)| `"1"` |
| `frameBorder=(NaN)`| (changed, warning)| `"NaN"` |
| `frameBorder=(float)`| (changed)| `"99.99"` |
| `frameBorder=(true)`| (initial, warning)| `<empty string>` |
| `frameBorder=(false)`| (initial, warning)| `<empty string>` |
| `frameBorder=(string 'true')`| (changed)| `"true"` |
| `frameBorder=(string 'false')`| (changed)| `"false"` |
| `frameBorder=(string 'on')`| (changed)| `"on"` |
| `frameBorder=(string 'off')`| (changed)| `"off"` |
| `frameBorder=(symbol)`| (initial, warning)| `<empty string>` |
| `frameBorder=(function)`| (initial, warning)| `<empty string>` |
| `frameBorder=(null)`| (initial)| `<empty string>` |
| `frameBorder=(undefined)`| (initial)| `<empty string>` |

## `from` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `from=(string)`| (changed)| `"a string"` |
| `from=(empty string)`| (changed)| `<empty string>` |
| `from=(array with string)`| (changed)| `"string"` |
| `from=(empty array)`| (changed)| `<empty string>` |
| `from=(object)`| (changed)| `"result of toString()"` |
| `from=(numeric string)`| (changed)| `"42"` |
| `from=(-1)`| (changed)| `"-1"` |
| `from=(0)`| (changed)| `"0"` |
| `from=(integer)`| (changed)| `"1"` |
| `from=(NaN)`| (changed, warning)| `"NaN"` |
| `from=(float)`| (changed)| `"99.99"` |
| `from=(true)`| (initial, warning)| `<null>` |
| `from=(false)`| (initial, warning)| `<null>` |
| `from=(string 'true')`| (changed)| `"true"` |
| `from=(string 'false')`| (changed)| `"false"` |
| `from=(string 'on')`| (changed)| `"on"` |
| `from=(string 'off')`| (changed)| `"off"` |
| `from=(symbol)`| (initial, warning)| `<null>` |
| `from=(function)`| (initial, warning)| `<null>` |
| `from=(null)`| (initial)| `<null>` |
| `from=(undefined)`| (initial)| `<null>` |

## `fx` (on `<radialGradient>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fx=(string)`| (changed)| `<SVGLength: 10px>` |
| `fx=(empty string)`| (initial)| `<SVGLength: 50%>` |
| `fx=(array with string)`| (changed)| `<SVGLength: 10px>` |
| `fx=(empty array)`| (initial)| `<SVGLength: 50%>` |
| `fx=(object)`| (initial)| `<SVGLength: 50%>` |
| `fx=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `fx=(-1)`| (changed)| `<SVGLength: -1>` |
| `fx=(0)`| (changed)| `<SVGLength: 0>` |
| `fx=(integer)`| (changed)| `<SVGLength: 1>` |
| `fx=(NaN)`| (initial, warning)| `<SVGLength: 50%>` |
| `fx=(float)`| (changed)| `<SVGLength: 99.99>` |
| `fx=(true)`| (initial, warning)| `<SVGLength: 50%>` |
| `fx=(false)`| (initial, warning)| `<SVGLength: 50%>` |
| `fx=(string 'true')`| (initial)| `<SVGLength: 50%>` |
| `fx=(string 'false')`| (initial)| `<SVGLength: 50%>` |
| `fx=(string 'on')`| (initial)| `<SVGLength: 50%>` |
| `fx=(string 'off')`| (initial)| `<SVGLength: 50%>` |
| `fx=(symbol)`| (initial, warning)| `<SVGLength: 50%>` |
| `fx=(function)`| (initial, warning)| `<SVGLength: 50%>` |
| `fx=(null)`| (initial)| `<SVGLength: 50%>` |
| `fx=(undefined)`| (initial)| `<SVGLength: 50%>` |

## `fX` (on `<radialGradient>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fX=(string)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fX=(empty string)`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(array with string)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fX=(empty array)`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(object)`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(numeric string)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fX=(-1)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fX=(0)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fX=(integer)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fX=(NaN)`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(float)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fX=(true)`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(false)`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(string 'true')`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(string 'false')`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(string 'on')`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(string 'off')`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(symbol)`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(function)`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(null)`| (initial, warning)| `<SVGLength: 50%>` |
| `fX=(undefined)`| (initial, warning)| `<SVGLength: 50%>` |

## `fY` (on `<radialGradient>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fY=(string)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fY=(empty string)`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(array with string)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fY=(empty array)`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(object)`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(numeric string)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fY=(-1)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fY=(0)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fY=(integer)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fY=(NaN)`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(float)`| (initial, warning, ssr mismatch)| `<SVGLength: 50%>` |
| `fY=(true)`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(false)`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(string 'true')`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(string 'false')`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(string 'on')`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(string 'off')`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(symbol)`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(function)`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(null)`| (initial, warning)| `<SVGLength: 50%>` |
| `fY=(undefined)`| (initial, warning)| `<SVGLength: 50%>` |

## `fy` (on `<radialGradient>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `fy=(string)`| (changed)| `<SVGLength: 20em>` |
| `fy=(empty string)`| (initial)| `<SVGLength: 50%>` |
| `fy=(array with string)`| (changed)| `<SVGLength: 20em>` |
| `fy=(empty array)`| (initial)| `<SVGLength: 50%>` |
| `fy=(object)`| (initial)| `<SVGLength: 50%>` |
| `fy=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `fy=(-1)`| (changed)| `<SVGLength: -1>` |
| `fy=(0)`| (changed)| `<SVGLength: 0>` |
| `fy=(integer)`| (changed)| `<SVGLength: 1>` |
| `fy=(NaN)`| (initial, warning)| `<SVGLength: 50%>` |
| `fy=(float)`| (changed)| `<SVGLength: 99.99>` |
| `fy=(true)`| (initial, warning)| `<SVGLength: 50%>` |
| `fy=(false)`| (initial, warning)| `<SVGLength: 50%>` |
| `fy=(string 'true')`| (initial)| `<SVGLength: 50%>` |
| `fy=(string 'false')`| (initial)| `<SVGLength: 50%>` |
| `fy=(string 'on')`| (initial)| `<SVGLength: 50%>` |
| `fy=(string 'off')`| (initial)| `<SVGLength: 50%>` |
| `fy=(symbol)`| (initial, warning)| `<SVGLength: 50%>` |
| `fy=(function)`| (initial, warning)| `<SVGLength: 50%>` |
| `fy=(null)`| (initial)| `<SVGLength: 50%>` |
| `fy=(undefined)`| (initial)| `<SVGLength: 50%>` |

## `G1` (on `<hkern>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `G1=(string)`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(empty string)`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(array with string)`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(empty array)`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(object)`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(numeric string)`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(-1)`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(0)`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(integer)`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(NaN)`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(float)`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(true)`| (initial, warning)| `<null>` |
| `G1=(false)`| (initial, warning)| `<null>` |
| `G1=(string 'true')`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(string 'false')`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(string 'on')`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(string 'off')`| (initial, warning, ssr mismatch)| `<null>` |
| `G1=(symbol)`| (initial, warning)| `<null>` |
| `G1=(function)`| (initial, warning)| `<null>` |
| `G1=(null)`| (initial, warning)| `<null>` |
| `G1=(undefined)`| (initial, warning)| `<null>` |

## `g1` (on `<hkern>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `g1=(string)`| (changed)| `"a string"` |
| `g1=(empty string)`| (changed)| `<empty string>` |
| `g1=(array with string)`| (changed)| `"string"` |
| `g1=(empty array)`| (changed)| `<empty string>` |
| `g1=(object)`| (changed)| `"result of toString()"` |
| `g1=(numeric string)`| (changed)| `"42"` |
| `g1=(-1)`| (changed)| `"-1"` |
| `g1=(0)`| (changed)| `"0"` |
| `g1=(integer)`| (changed)| `"1"` |
| `g1=(NaN)`| (changed, warning)| `"NaN"` |
| `g1=(float)`| (changed)| `"99.99"` |
| `g1=(true)`| (initial, warning)| `<null>` |
| `g1=(false)`| (initial, warning)| `<null>` |
| `g1=(string 'true')`| (changed)| `"true"` |
| `g1=(string 'false')`| (changed)| `"false"` |
| `g1=(string 'on')`| (changed)| `"on"` |
| `g1=(string 'off')`| (changed)| `"off"` |
| `g1=(symbol)`| (initial, warning)| `<null>` |
| `g1=(function)`| (initial, warning)| `<null>` |
| `g1=(null)`| (initial)| `<null>` |
| `g1=(undefined)`| (initial)| `<null>` |

## `G2` (on `<hkern>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `G2=(string)`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(empty string)`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(array with string)`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(empty array)`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(object)`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(numeric string)`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(-1)`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(0)`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(integer)`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(NaN)`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(float)`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(true)`| (initial, warning)| `<null>` |
| `G2=(false)`| (initial, warning)| `<null>` |
| `G2=(string 'true')`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(string 'false')`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(string 'on')`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(string 'off')`| (initial, warning, ssr mismatch)| `<null>` |
| `G2=(symbol)`| (initial, warning)| `<null>` |
| `G2=(function)`| (initial, warning)| `<null>` |
| `G2=(null)`| (initial, warning)| `<null>` |
| `G2=(undefined)`| (initial, warning)| `<null>` |

## `g2` (on `<hkern>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `g2=(string)`| (changed)| `"a string"` |
| `g2=(empty string)`| (changed)| `<empty string>` |
| `g2=(array with string)`| (changed)| `"string"` |
| `g2=(empty array)`| (changed)| `<empty string>` |
| `g2=(object)`| (changed)| `"result of toString()"` |
| `g2=(numeric string)`| (changed)| `"42"` |
| `g2=(-1)`| (changed)| `"-1"` |
| `g2=(0)`| (changed)| `"0"` |
| `g2=(integer)`| (changed)| `"1"` |
| `g2=(NaN)`| (changed, warning)| `"NaN"` |
| `g2=(float)`| (changed)| `"99.99"` |
| `g2=(true)`| (initial, warning)| `<null>` |
| `g2=(false)`| (initial, warning)| `<null>` |
| `g2=(string 'true')`| (changed)| `"true"` |
| `g2=(string 'false')`| (changed)| `"false"` |
| `g2=(string 'on')`| (changed)| `"on"` |
| `g2=(string 'off')`| (changed)| `"off"` |
| `g2=(symbol)`| (initial, warning)| `<null>` |
| `g2=(function)`| (initial, warning)| `<null>` |
| `g2=(null)`| (initial)| `<null>` |
| `g2=(undefined)`| (initial)| `<null>` |

## `glyph-name` (on `<glyph>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `glyph-name=(string)`| (changed, warning)| `"a string"` |
| `glyph-name=(empty string)`| (changed, warning)| `<empty string>` |
| `glyph-name=(array with string)`| (changed, warning)| `"string"` |
| `glyph-name=(empty array)`| (changed, warning)| `<empty string>` |
| `glyph-name=(object)`| (changed, warning)| `"result of toString()"` |
| `glyph-name=(numeric string)`| (changed, warning)| `"42"` |
| `glyph-name=(-1)`| (changed, warning)| `"-1"` |
| `glyph-name=(0)`| (changed, warning)| `"0"` |
| `glyph-name=(integer)`| (changed, warning)| `"1"` |
| `glyph-name=(NaN)`| (changed, warning)| `"NaN"` |
| `glyph-name=(float)`| (changed, warning)| `"99.99"` |
| `glyph-name=(true)`| (initial, warning)| `<null>` |
| `glyph-name=(false)`| (initial, warning)| `<null>` |
| `glyph-name=(string 'true')`| (changed, warning)| `"true"` |
| `glyph-name=(string 'false')`| (changed, warning)| `"false"` |
| `glyph-name=(string 'on')`| (changed, warning)| `"on"` |
| `glyph-name=(string 'off')`| (changed, warning)| `"off"` |
| `glyph-name=(symbol)`| (initial, warning)| `<null>` |
| `glyph-name=(function)`| (initial, warning)| `<null>` |
| `glyph-name=(null)`| (initial, warning)| `<null>` |
| `glyph-name=(undefined)`| (initial, warning)| `<null>` |

## `glyph-orientation-horizontal` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `glyph-orientation-horizontal=(string)`| (changed, warning)| `"a string"` |
| `glyph-orientation-horizontal=(empty string)`| (changed, warning)| `<empty string>` |
| `glyph-orientation-horizontal=(array with string)`| (changed, warning)| `"string"` |
| `glyph-orientation-horizontal=(empty array)`| (changed, warning)| `<empty string>` |
| `glyph-orientation-horizontal=(object)`| (changed, warning)| `"result of toString()"` |
| `glyph-orientation-horizontal=(numeric string)`| (changed, warning)| `"42"` |
| `glyph-orientation-horizontal=(-1)`| (changed, warning)| `"-1"` |
| `glyph-orientation-horizontal=(0)`| (changed, warning)| `"0"` |
| `glyph-orientation-horizontal=(integer)`| (changed, warning)| `"1"` |
| `glyph-orientation-horizontal=(NaN)`| (changed, warning)| `"NaN"` |
| `glyph-orientation-horizontal=(float)`| (changed, warning)| `"99.99"` |
| `glyph-orientation-horizontal=(true)`| (initial, warning)| `<null>` |
| `glyph-orientation-horizontal=(false)`| (initial, warning)| `<null>` |
| `glyph-orientation-horizontal=(string 'true')`| (changed, warning)| `"true"` |
| `glyph-orientation-horizontal=(string 'false')`| (changed, warning)| `"false"` |
| `glyph-orientation-horizontal=(string 'on')`| (changed, warning)| `"on"` |
| `glyph-orientation-horizontal=(string 'off')`| (changed, warning)| `"off"` |
| `glyph-orientation-horizontal=(symbol)`| (initial, warning)| `<null>` |
| `glyph-orientation-horizontal=(function)`| (initial, warning)| `<null>` |
| `glyph-orientation-horizontal=(null)`| (initial, warning)| `<null>` |
| `glyph-orientation-horizontal=(undefined)`| (initial, warning)| `<null>` |

## `glyph-orientation-vertical` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `glyph-orientation-vertical=(string)`| (changed, warning)| `"a string"` |
| `glyph-orientation-vertical=(empty string)`| (changed, warning)| `<empty string>` |
| `glyph-orientation-vertical=(array with string)`| (changed, warning)| `"string"` |
| `glyph-orientation-vertical=(empty array)`| (changed, warning)| `<empty string>` |
| `glyph-orientation-vertical=(object)`| (changed, warning)| `"result of toString()"` |
| `glyph-orientation-vertical=(numeric string)`| (changed, warning)| `"42"` |
| `glyph-orientation-vertical=(-1)`| (changed, warning)| `"-1"` |
| `glyph-orientation-vertical=(0)`| (changed, warning)| `"0"` |
| `glyph-orientation-vertical=(integer)`| (changed, warning)| `"1"` |
| `glyph-orientation-vertical=(NaN)`| (changed, warning)| `"NaN"` |
| `glyph-orientation-vertical=(float)`| (changed, warning)| `"99.99"` |
| `glyph-orientation-vertical=(true)`| (initial, warning)| `<null>` |
| `glyph-orientation-vertical=(false)`| (initial, warning)| `<null>` |
| `glyph-orientation-vertical=(string 'true')`| (changed, warning)| `"true"` |
| `glyph-orientation-vertical=(string 'false')`| (changed, warning)| `"false"` |
| `glyph-orientation-vertical=(string 'on')`| (changed, warning)| `"on"` |
| `glyph-orientation-vertical=(string 'off')`| (changed, warning)| `"off"` |
| `glyph-orientation-vertical=(symbol)`| (initial, warning)| `<null>` |
| `glyph-orientation-vertical=(function)`| (initial, warning)| `<null>` |
| `glyph-orientation-vertical=(null)`| (initial, warning)| `<null>` |
| `glyph-orientation-vertical=(undefined)`| (initial, warning)| `<null>` |

## `glyphName` (on `<glyph>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `glyphName=(string)`| (changed)| `"a string"` |
| `glyphName=(empty string)`| (changed)| `<empty string>` |
| `glyphName=(array with string)`| (changed)| `"string"` |
| `glyphName=(empty array)`| (changed)| `<empty string>` |
| `glyphName=(object)`| (changed)| `"result of toString()"` |
| `glyphName=(numeric string)`| (changed)| `"42"` |
| `glyphName=(-1)`| (changed)| `"-1"` |
| `glyphName=(0)`| (changed)| `"0"` |
| `glyphName=(integer)`| (changed)| `"1"` |
| `glyphName=(NaN)`| (changed, warning)| `"NaN"` |
| `glyphName=(float)`| (changed)| `"99.99"` |
| `glyphName=(true)`| (initial, warning)| `<null>` |
| `glyphName=(false)`| (initial, warning)| `<null>` |
| `glyphName=(string 'true')`| (changed)| `"true"` |
| `glyphName=(string 'false')`| (changed)| `"false"` |
| `glyphName=(string 'on')`| (changed)| `"on"` |
| `glyphName=(string 'off')`| (changed)| `"off"` |
| `glyphName=(symbol)`| (initial, warning)| `<null>` |
| `glyphName=(function)`| (initial, warning)| `<null>` |
| `glyphName=(null)`| (initial)| `<null>` |
| `glyphName=(undefined)`| (initial)| `<null>` |

## `glyphOrientationHorizontal` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `glyphOrientationHorizontal=(string)`| (changed)| `"a string"` |
| `glyphOrientationHorizontal=(empty string)`| (changed)| `<empty string>` |
| `glyphOrientationHorizontal=(array with string)`| (changed)| `"string"` |
| `glyphOrientationHorizontal=(empty array)`| (changed)| `<empty string>` |
| `glyphOrientationHorizontal=(object)`| (changed)| `"result of toString()"` |
| `glyphOrientationHorizontal=(numeric string)`| (changed)| `"42"` |
| `glyphOrientationHorizontal=(-1)`| (changed)| `"-1"` |
| `glyphOrientationHorizontal=(0)`| (changed)| `"0"` |
| `glyphOrientationHorizontal=(integer)`| (changed)| `"1"` |
| `glyphOrientationHorizontal=(NaN)`| (changed, warning)| `"NaN"` |
| `glyphOrientationHorizontal=(float)`| (changed)| `"99.99"` |
| `glyphOrientationHorizontal=(true)`| (initial, warning)| `<null>` |
| `glyphOrientationHorizontal=(false)`| (initial, warning)| `<null>` |
| `glyphOrientationHorizontal=(string 'true')`| (changed)| `"true"` |
| `glyphOrientationHorizontal=(string 'false')`| (changed)| `"false"` |
| `glyphOrientationHorizontal=(string 'on')`| (changed)| `"on"` |
| `glyphOrientationHorizontal=(string 'off')`| (changed)| `"off"` |
| `glyphOrientationHorizontal=(symbol)`| (initial, warning)| `<null>` |
| `glyphOrientationHorizontal=(function)`| (initial, warning)| `<null>` |
| `glyphOrientationHorizontal=(null)`| (initial)| `<null>` |
| `glyphOrientationHorizontal=(undefined)`| (initial)| `<null>` |

## `glyphOrientationVertical` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `glyphOrientationVertical=(string)`| (changed)| `"a string"` |
| `glyphOrientationVertical=(empty string)`| (changed)| `<empty string>` |
| `glyphOrientationVertical=(array with string)`| (changed)| `"string"` |
| `glyphOrientationVertical=(empty array)`| (changed)| `<empty string>` |
| `glyphOrientationVertical=(object)`| (changed)| `"result of toString()"` |
| `glyphOrientationVertical=(numeric string)`| (changed)| `"42"` |
| `glyphOrientationVertical=(-1)`| (changed)| `"-1"` |
| `glyphOrientationVertical=(0)`| (changed)| `"0"` |
| `glyphOrientationVertical=(integer)`| (changed)| `"1"` |
| `glyphOrientationVertical=(NaN)`| (changed, warning)| `"NaN"` |
| `glyphOrientationVertical=(float)`| (changed)| `"99.99"` |
| `glyphOrientationVertical=(true)`| (initial, warning)| `<null>` |
| `glyphOrientationVertical=(false)`| (initial, warning)| `<null>` |
| `glyphOrientationVertical=(string 'true')`| (changed)| `"true"` |
| `glyphOrientationVertical=(string 'false')`| (changed)| `"false"` |
| `glyphOrientationVertical=(string 'on')`| (changed)| `"on"` |
| `glyphOrientationVertical=(string 'off')`| (changed)| `"off"` |
| `glyphOrientationVertical=(symbol)`| (initial, warning)| `<null>` |
| `glyphOrientationVertical=(function)`| (initial, warning)| `<null>` |
| `glyphOrientationVertical=(null)`| (initial)| `<null>` |
| `glyphOrientationVertical=(undefined)`| (initial)| `<null>` |

## `glyphRef` (on `<altGlyph>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `glyphRef=(string)`| (initial)| `<null>` |
| `glyphRef=(empty string)`| (initial)| `<null>` |
| `glyphRef=(array with string)`| (initial)| `<null>` |
| `glyphRef=(empty array)`| (initial)| `<null>` |
| `glyphRef=(object)`| (initial)| `<null>` |
| `glyphRef=(numeric string)`| (initial)| `<null>` |
| `glyphRef=(-1)`| (initial)| `<null>` |
| `glyphRef=(0)`| (initial)| `<null>` |
| `glyphRef=(integer)`| (initial)| `<null>` |
| `glyphRef=(NaN)`| (initial, warning)| `<null>` |
| `glyphRef=(float)`| (initial)| `<null>` |
| `glyphRef=(true)`| (initial, warning)| `<null>` |
| `glyphRef=(false)`| (initial, warning)| `<null>` |
| `glyphRef=(string 'true')`| (initial)| `<null>` |
| `glyphRef=(string 'false')`| (initial)| `<null>` |
| `glyphRef=(string 'on')`| (initial)| `<null>` |
| `glyphRef=(string 'off')`| (initial)| `<null>` |
| `glyphRef=(symbol)`| (initial, warning)| `<null>` |
| `glyphRef=(function)`| (initial, warning)| `<null>` |
| `glyphRef=(null)`| (initial)| `<null>` |
| `glyphRef=(undefined)`| (initial)| `<null>` |

## `gradientTransform` (on `<linearGradient>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `gradientTransform=(string)`| (changed)| `[<SVGMatrix 1 0 0 1 -10 -20>/2/0, <SVGMatrix 2 0 0 2 0 0>/3/0, <SVGMatrix 0.7071067811865476 0.7071067811865475 -0.7071067811865475 0.7071067811865476 0 0>/4/45, <SVGMatrix 1 0 0 1 5 10>/2/0]` |
| `gradientTransform=(empty string)`| (initial)| `[]` |
| `gradientTransform=(array with string)`| (changed)| `[<SVGMatrix 1 0 0 1 -10 -20>/2/0, <SVGMatrix 2 0 0 2 0 0>/3/0, <SVGMatrix 0.7071067811865476 0.7071067811865475 -0.7071067811865475 0.7071067811865476 0 0>/4/45, <SVGMatrix 1 0 0 1 5 10>/2/0]` |
| `gradientTransform=(empty array)`| (initial)| `[]` |
| `gradientTransform=(object)`| (initial)| `[]` |
| `gradientTransform=(numeric string)`| (initial)| `[]` |
| `gradientTransform=(-1)`| (initial)| `[]` |
| `gradientTransform=(0)`| (initial)| `[]` |
| `gradientTransform=(integer)`| (initial)| `[]` |
| `gradientTransform=(NaN)`| (initial, warning)| `[]` |
| `gradientTransform=(float)`| (initial)| `[]` |
| `gradientTransform=(true)`| (initial, warning)| `[]` |
| `gradientTransform=(false)`| (initial, warning)| `[]` |
| `gradientTransform=(string 'true')`| (initial)| `[]` |
| `gradientTransform=(string 'false')`| (initial)| `[]` |
| `gradientTransform=(string 'on')`| (initial)| `[]` |
| `gradientTransform=(string 'off')`| (initial)| `[]` |
| `gradientTransform=(symbol)`| (initial, warning)| `[]` |
| `gradientTransform=(function)`| (initial, warning)| `[]` |
| `gradientTransform=(null)`| (initial)| `[]` |
| `gradientTransform=(undefined)`| (initial)| `[]` |

## `gradientUnits` (on `<linearGradient>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `gradientUnits=(string)`| (changed)| `<number: 1>` |
| `gradientUnits=(empty string)`| (initial)| `<number: 2>` |
| `gradientUnits=(array with string)`| (changed)| `<number: 1>` |
| `gradientUnits=(empty array)`| (initial)| `<number: 2>` |
| `gradientUnits=(object)`| (initial)| `<number: 2>` |
| `gradientUnits=(numeric string)`| (initial)| `<number: 2>` |
| `gradientUnits=(-1)`| (initial)| `<number: 2>` |
| `gradientUnits=(0)`| (initial)| `<number: 2>` |
| `gradientUnits=(integer)`| (initial)| `<number: 2>` |
| `gradientUnits=(NaN)`| (initial, warning)| `<number: 2>` |
| `gradientUnits=(float)`| (initial)| `<number: 2>` |
| `gradientUnits=(true)`| (initial, warning)| `<number: 2>` |
| `gradientUnits=(false)`| (initial, warning)| `<number: 2>` |
| `gradientUnits=(string 'true')`| (initial)| `<number: 2>` |
| `gradientUnits=(string 'false')`| (initial)| `<number: 2>` |
| `gradientUnits=(string 'on')`| (initial)| `<number: 2>` |
| `gradientUnits=(string 'off')`| (initial)| `<number: 2>` |
| `gradientUnits=(symbol)`| (initial, warning)| `<number: 2>` |
| `gradientUnits=(function)`| (initial, warning)| `<number: 2>` |
| `gradientUnits=(null)`| (initial)| `<number: 2>` |
| `gradientUnits=(undefined)`| (initial)| `<number: 2>` |

## `hanging` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `hanging=(string)`| (changed)| `"a string"` |
| `hanging=(empty string)`| (changed)| `<empty string>` |
| `hanging=(array with string)`| (changed)| `"string"` |
| `hanging=(empty array)`| (changed)| `<empty string>` |
| `hanging=(object)`| (changed)| `"result of toString()"` |
| `hanging=(numeric string)`| (changed)| `"42"` |
| `hanging=(-1)`| (changed)| `"-1"` |
| `hanging=(0)`| (changed)| `"0"` |
| `hanging=(integer)`| (changed)| `"1"` |
| `hanging=(NaN)`| (changed, warning)| `"NaN"` |
| `hanging=(float)`| (changed)| `"99.99"` |
| `hanging=(true)`| (initial, warning)| `<null>` |
| `hanging=(false)`| (initial, warning)| `<null>` |
| `hanging=(string 'true')`| (changed)| `"true"` |
| `hanging=(string 'false')`| (changed)| `"false"` |
| `hanging=(string 'on')`| (changed)| `"on"` |
| `hanging=(string 'off')`| (changed)| `"off"` |
| `hanging=(symbol)`| (initial, warning)| `<null>` |
| `hanging=(function)`| (initial, warning)| `<null>` |
| `hanging=(null)`| (initial)| `<null>` |
| `hanging=(undefined)`| (initial)| `<null>` |

## `headers` (on `<td>` inside `<tr>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `headers=(string)`| (changed, ssr error, ssr mismatch)| `"a string"` |
| `headers=(empty string)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `headers=(array with string)`| (changed, ssr error, ssr mismatch)| `"string"` |
| `headers=(empty array)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `headers=(object)`| (changed, ssr error, ssr mismatch)| `"result of toString()"` |
| `headers=(numeric string)`| (changed, ssr error, ssr mismatch)| `"42"` |
| `headers=(-1)`| (changed, ssr error, ssr mismatch)| `"-1"` |
| `headers=(0)`| (changed, ssr error, ssr mismatch)| `"0"` |
| `headers=(integer)`| (changed, ssr error, ssr mismatch)| `"1"` |
| `headers=(NaN)`| (changed, warning, ssr error, ssr mismatch)| `"NaN"` |
| `headers=(float)`| (changed, ssr error, ssr mismatch)| `"99.99"` |
| `headers=(true)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `headers=(false)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `headers=(string 'true')`| (changed, ssr error, ssr mismatch)| `"true"` |
| `headers=(string 'false')`| (changed, ssr error, ssr mismatch)| `"false"` |
| `headers=(string 'on')`| (changed, ssr error, ssr mismatch)| `"on"` |
| `headers=(string 'off')`| (changed, ssr error, ssr mismatch)| `"off"` |
| `headers=(symbol)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `headers=(function)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `headers=(null)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `headers=(undefined)`| (initial, ssr error, ssr mismatch)| `<empty string>` |

## `height` (on `<img>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `height=(string)`| (initial)| `<number: 0>` |
| `height=(empty string)`| (initial)| `<number: 0>` |
| `height=(array with string)`| (initial)| `<number: 0>` |
| `height=(empty array)`| (initial)| `<number: 0>` |
| `height=(object)`| (initial)| `<number: 0>` |
| `height=(numeric string)`| (changed)| `<number: 42>` |
| `height=(-1)`| (initial)| `<number: 0>` |
| `height=(0)`| (initial)| `<number: 0>` |
| `height=(integer)`| (changed)| `<number: 1>` |
| `height=(NaN)`| (initial, warning)| `<number: 0>` |
| `height=(float)`| (changed)| `<number: 99>` |
| `height=(true)`| (initial, warning)| `<number: 0>` |
| `height=(false)`| (initial, warning)| `<number: 0>` |
| `height=(string 'true')`| (initial)| `<number: 0>` |
| `height=(string 'false')`| (initial)| `<number: 0>` |
| `height=(string 'on')`| (initial)| `<number: 0>` |
| `height=(string 'off')`| (initial)| `<number: 0>` |
| `height=(symbol)`| (initial, warning)| `<number: 0>` |
| `height=(function)`| (initial, warning)| `<number: 0>` |
| `height=(null)`| (initial)| `<number: 0>` |
| `height=(undefined)`| (initial)| `<number: 0>` |

## `height` (on `<rect>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `height=(string)`| (changed)| `<SVGLength: 100%>` |
| `height=(empty string)`| (initial)| `<SVGLength: 0>` |
| `height=(array with string)`| (changed)| `<SVGLength: 100%>` |
| `height=(empty array)`| (initial)| `<SVGLength: 0>` |
| `height=(object)`| (initial)| `<SVGLength: 0>` |
| `height=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `height=(-1)`| (changed)| `<SVGLength: -1>` |
| `height=(0)`| (initial)| `<SVGLength: 0>` |
| `height=(integer)`| (changed)| `<SVGLength: 1>` |
| `height=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `height=(float)`| (changed)| `<SVGLength: 99.99>` |
| `height=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `height=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `height=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `height=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `height=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `height=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `height=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `height=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `height=(null)`| (initial)| `<SVGLength: 0>` |
| `height=(undefined)`| (initial)| `<SVGLength: 0>` |

## `hidden` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `hidden=(string)`| (changed)| `<boolean: true>` |
| `hidden=(empty string)`| (initial)| `<boolean: false>` |
| `hidden=(array with string)`| (changed)| `<boolean: true>` |
| `hidden=(empty array)`| (changed)| `<boolean: true>` |
| `hidden=(object)`| (changed)| `<boolean: true>` |
| `hidden=(numeric string)`| (changed)| `<boolean: true>` |
| `hidden=(-1)`| (changed)| `<boolean: true>` |
| `hidden=(0)`| (initial)| `<boolean: false>` |
| `hidden=(integer)`| (changed)| `<boolean: true>` |
| `hidden=(NaN)`| (initial, warning)| `<boolean: false>` |
| `hidden=(float)`| (changed)| `<boolean: true>` |
| `hidden=(true)`| (changed)| `<boolean: true>` |
| `hidden=(false)`| (initial)| `<boolean: false>` |
| `hidden=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `hidden=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `hidden=(string 'on')`| (changed)| `<boolean: true>` |
| `hidden=(string 'off')`| (changed)| `<boolean: true>` |
| `hidden=(symbol)`| (initial, warning)| `<boolean: false>` |
| `hidden=(function)`| (initial, warning)| `<boolean: false>` |
| `hidden=(null)`| (initial)| `<boolean: false>` |
| `hidden=(undefined)`| (initial)| `<boolean: false>` |

## `high` (on `<meter>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `high=(string)`| (initial)| `<number: 1>` |
| `high=(empty string)`| (initial)| `<number: 1>` |
| `high=(array with string)`| (initial)| `<number: 1>` |
| `high=(empty array)`| (initial)| `<number: 1>` |
| `high=(object)`| (initial)| `<number: 1>` |
| `high=(numeric string)`| (initial)| `<number: 1>` |
| `high=(-1)`| (changed)| `<number: 0>` |
| `high=(0)`| (changed)| `<number: 0>` |
| `high=(integer)`| (initial)| `<number: 1>` |
| `high=(NaN)`| (initial, warning)| `<number: 1>` |
| `high=(float)`| (initial)| `<number: 1>` |
| `high=(true)`| (initial, warning)| `<number: 1>` |
| `high=(false)`| (initial, warning)| `<number: 1>` |
| `high=(string 'true')`| (initial)| `<number: 1>` |
| `high=(string 'false')`| (initial)| `<number: 1>` |
| `high=(string 'on')`| (initial)| `<number: 1>` |
| `high=(string 'off')`| (initial)| `<number: 1>` |
| `high=(symbol)`| (initial, warning)| `<number: 1>` |
| `high=(function)`| (initial, warning)| `<number: 1>` |
| `high=(null)`| (initial)| `<number: 1>` |
| `high=(undefined)`| (initial)| `<number: 1>` |

## `horiz-adv-x` (on `<font>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `horiz-adv-x=(string)`| (changed, warning)| `"a string"` |
| `horiz-adv-x=(empty string)`| (changed, warning)| `<empty string>` |
| `horiz-adv-x=(array with string)`| (changed, warning)| `"string"` |
| `horiz-adv-x=(empty array)`| (changed, warning)| `<empty string>` |
| `horiz-adv-x=(object)`| (changed, warning)| `"result of toString()"` |
| `horiz-adv-x=(numeric string)`| (changed, warning)| `"42"` |
| `horiz-adv-x=(-1)`| (changed, warning)| `"-1"` |
| `horiz-adv-x=(0)`| (changed, warning)| `"0"` |
| `horiz-adv-x=(integer)`| (changed, warning)| `"1"` |
| `horiz-adv-x=(NaN)`| (changed, warning)| `"NaN"` |
| `horiz-adv-x=(float)`| (changed, warning)| `"99.99"` |
| `horiz-adv-x=(true)`| (initial, warning)| `<null>` |
| `horiz-adv-x=(false)`| (initial, warning)| `<null>` |
| `horiz-adv-x=(string 'true')`| (changed, warning)| `"true"` |
| `horiz-adv-x=(string 'false')`| (changed, warning)| `"false"` |
| `horiz-adv-x=(string 'on')`| (changed, warning)| `"on"` |
| `horiz-adv-x=(string 'off')`| (changed, warning)| `"off"` |
| `horiz-adv-x=(symbol)`| (initial, warning)| `<null>` |
| `horiz-adv-x=(function)`| (initial, warning)| `<null>` |
| `horiz-adv-x=(null)`| (initial, warning)| `<null>` |
| `horiz-adv-x=(undefined)`| (initial, warning)| `<null>` |

## `horiz-origin-x` (on `<font>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `horiz-origin-x=(string)`| (changed, warning)| `"a string"` |
| `horiz-origin-x=(empty string)`| (changed, warning)| `<empty string>` |
| `horiz-origin-x=(array with string)`| (changed, warning)| `"string"` |
| `horiz-origin-x=(empty array)`| (changed, warning)| `<empty string>` |
| `horiz-origin-x=(object)`| (changed, warning)| `"result of toString()"` |
| `horiz-origin-x=(numeric string)`| (changed, warning)| `"42"` |
| `horiz-origin-x=(-1)`| (changed, warning)| `"-1"` |
| `horiz-origin-x=(0)`| (changed, warning)| `"0"` |
| `horiz-origin-x=(integer)`| (changed, warning)| `"1"` |
| `horiz-origin-x=(NaN)`| (changed, warning)| `"NaN"` |
| `horiz-origin-x=(float)`| (changed, warning)| `"99.99"` |
| `horiz-origin-x=(true)`| (initial, warning)| `<null>` |
| `horiz-origin-x=(false)`| (initial, warning)| `<null>` |
| `horiz-origin-x=(string 'true')`| (changed, warning)| `"true"` |
| `horiz-origin-x=(string 'false')`| (changed, warning)| `"false"` |
| `horiz-origin-x=(string 'on')`| (changed, warning)| `"on"` |
| `horiz-origin-x=(string 'off')`| (changed, warning)| `"off"` |
| `horiz-origin-x=(symbol)`| (initial, warning)| `<null>` |
| `horiz-origin-x=(function)`| (initial, warning)| `<null>` |
| `horiz-origin-x=(null)`| (initial, warning)| `<null>` |
| `horiz-origin-x=(undefined)`| (initial, warning)| `<null>` |

## `horizAdvX` (on `<font>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `horizAdvX=(string)`| (changed)| `"a string"` |
| `horizAdvX=(empty string)`| (changed)| `<empty string>` |
| `horizAdvX=(array with string)`| (changed)| `"string"` |
| `horizAdvX=(empty array)`| (changed)| `<empty string>` |
| `horizAdvX=(object)`| (changed)| `"result of toString()"` |
| `horizAdvX=(numeric string)`| (changed)| `"42"` |
| `horizAdvX=(-1)`| (changed)| `"-1"` |
| `horizAdvX=(0)`| (changed)| `"0"` |
| `horizAdvX=(integer)`| (changed)| `"1"` |
| `horizAdvX=(NaN)`| (changed, warning)| `"NaN"` |
| `horizAdvX=(float)`| (changed)| `"99.99"` |
| `horizAdvX=(true)`| (initial, warning)| `<null>` |
| `horizAdvX=(false)`| (initial, warning)| `<null>` |
| `horizAdvX=(string 'true')`| (changed)| `"true"` |
| `horizAdvX=(string 'false')`| (changed)| `"false"` |
| `horizAdvX=(string 'on')`| (changed)| `"on"` |
| `horizAdvX=(string 'off')`| (changed)| `"off"` |
| `horizAdvX=(symbol)`| (initial, warning)| `<null>` |
| `horizAdvX=(function)`| (initial, warning)| `<null>` |
| `horizAdvX=(null)`| (initial)| `<null>` |
| `horizAdvX=(undefined)`| (initial)| `<null>` |

## `horizOriginX` (on `<font>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `horizOriginX=(string)`| (changed)| `"a string"` |
| `horizOriginX=(empty string)`| (changed)| `<empty string>` |
| `horizOriginX=(array with string)`| (changed)| `"string"` |
| `horizOriginX=(empty array)`| (changed)| `<empty string>` |
| `horizOriginX=(object)`| (changed)| `"result of toString()"` |
| `horizOriginX=(numeric string)`| (changed)| `"42"` |
| `horizOriginX=(-1)`| (changed)| `"-1"` |
| `horizOriginX=(0)`| (changed)| `"0"` |
| `horizOriginX=(integer)`| (changed)| `"1"` |
| `horizOriginX=(NaN)`| (changed, warning)| `"NaN"` |
| `horizOriginX=(float)`| (changed)| `"99.99"` |
| `horizOriginX=(true)`| (initial, warning)| `<null>` |
| `horizOriginX=(false)`| (initial, warning)| `<null>` |
| `horizOriginX=(string 'true')`| (changed)| `"true"` |
| `horizOriginX=(string 'false')`| (changed)| `"false"` |
| `horizOriginX=(string 'on')`| (changed)| `"on"` |
| `horizOriginX=(string 'off')`| (changed)| `"off"` |
| `horizOriginX=(symbol)`| (initial, warning)| `<null>` |
| `horizOriginX=(function)`| (initial, warning)| `<null>` |
| `horizOriginX=(null)`| (initial)| `<null>` |
| `horizOriginX=(undefined)`| (initial)| `<null>` |

## `href` (on `<a>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `href=(string)`| (changed)| `"https://reactjs.com/"` |
| `href=(empty string)`| (changed)| `"http://localhost:3000/"` |
| `href=(array with string)`| (changed)| `"https://reactjs.com/"` |
| `href=(empty array)`| (changed)| `"http://localhost:3000/"` |
| `href=(object)`| (changed)| `"http://localhost:3000/result%20of%20toString()"` |
| `href=(numeric string)`| (changed)| `"http://localhost:3000/42"` |
| `href=(-1)`| (changed)| `"http://localhost:3000/-1"` |
| `href=(0)`| (changed)| `"http://localhost:3000/0"` |
| `href=(integer)`| (changed)| `"http://localhost:3000/1"` |
| `href=(NaN)`| (changed, warning)| `"http://localhost:3000/NaN"` |
| `href=(float)`| (changed)| `"http://localhost:3000/99.99"` |
| `href=(true)`| (initial, warning)| `<empty string>` |
| `href=(false)`| (initial, warning)| `<empty string>` |
| `href=(string 'true')`| (changed)| `"http://localhost:3000/true"` |
| `href=(string 'false')`| (changed)| `"http://localhost:3000/false"` |
| `href=(string 'on')`| (changed)| `"http://localhost:3000/on"` |
| `href=(string 'off')`| (changed)| `"http://localhost:3000/off"` |
| `href=(symbol)`| (initial, warning)| `<empty string>` |
| `href=(function)`| (initial, warning)| `<empty string>` |
| `href=(null)`| (initial)| `<empty string>` |
| `href=(undefined)`| (initial)| `<empty string>` |

## `hrefLang` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `hrefLang=(string)`| (changed)| `"a string"` |
| `hrefLang=(empty string)`| (changed)| `<empty string>` |
| `hrefLang=(array with string)`| (changed)| `"string"` |
| `hrefLang=(empty array)`| (changed)| `<empty string>` |
| `hrefLang=(object)`| (changed)| `"result of toString()"` |
| `hrefLang=(numeric string)`| (changed)| `"42"` |
| `hrefLang=(-1)`| (changed)| `"-1"` |
| `hrefLang=(0)`| (changed)| `"0"` |
| `hrefLang=(integer)`| (changed)| `"1"` |
| `hrefLang=(NaN)`| (changed, warning)| `"NaN"` |
| `hrefLang=(float)`| (changed)| `"99.99"` |
| `hrefLang=(true)`| (initial, warning)| `<null>` |
| `hrefLang=(false)`| (initial, warning)| `<null>` |
| `hrefLang=(string 'true')`| (changed)| `"true"` |
| `hrefLang=(string 'false')`| (changed)| `"false"` |
| `hrefLang=(string 'on')`| (changed)| `"on"` |
| `hrefLang=(string 'off')`| (changed)| `"off"` |
| `hrefLang=(symbol)`| (initial, warning)| `<null>` |
| `hrefLang=(function)`| (initial, warning)| `<null>` |
| `hrefLang=(null)`| (initial)| `<null>` |
| `hrefLang=(undefined)`| (initial)| `<null>` |

## `htmlFor` (on `<label>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `htmlFor=(string)`| (changed)| `"a string"` |
| `htmlFor=(empty string)`| (initial)| `<empty string>` |
| `htmlFor=(array with string)`| (changed)| `"string"` |
| `htmlFor=(empty array)`| (initial)| `<empty string>` |
| `htmlFor=(object)`| (changed)| `"result of toString()"` |
| `htmlFor=(numeric string)`| (changed)| `"42"` |
| `htmlFor=(-1)`| (changed)| `"-1"` |
| `htmlFor=(0)`| (changed)| `"0"` |
| `htmlFor=(integer)`| (changed)| `"1"` |
| `htmlFor=(NaN)`| (changed, warning)| `"NaN"` |
| `htmlFor=(float)`| (changed)| `"99.99"` |
| `htmlFor=(true)`| (initial, warning)| `<empty string>` |
| `htmlFor=(false)`| (initial, warning)| `<empty string>` |
| `htmlFor=(string 'true')`| (changed)| `"true"` |
| `htmlFor=(string 'false')`| (changed)| `"false"` |
| `htmlFor=(string 'on')`| (changed)| `"on"` |
| `htmlFor=(string 'off')`| (changed)| `"off"` |
| `htmlFor=(symbol)`| (initial, warning)| `<empty string>` |
| `htmlFor=(function)`| (initial, warning)| `<empty string>` |
| `htmlFor=(null)`| (initial)| `<empty string>` |
| `htmlFor=(undefined)`| (initial)| `<empty string>` |

## `http-equiv` (on `<meta>` inside `<head>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `http-equiv=(string)`| (changed, warning)| `"a string"` |
| `http-equiv=(empty string)`| (initial, warning)| `<empty string>` |
| `http-equiv=(array with string)`| (changed, warning)| `"string"` |
| `http-equiv=(empty array)`| (initial, warning)| `<empty string>` |
| `http-equiv=(object)`| (changed, warning)| `"result of toString()"` |
| `http-equiv=(numeric string)`| (changed, warning)| `"42"` |
| `http-equiv=(-1)`| (changed, warning)| `"-1"` |
| `http-equiv=(0)`| (changed, warning)| `"0"` |
| `http-equiv=(integer)`| (changed, warning)| `"1"` |
| `http-equiv=(NaN)`| (changed, warning)| `"NaN"` |
| `http-equiv=(float)`| (changed, warning)| `"99.99"` |
| `http-equiv=(true)`| (initial, warning)| `<empty string>` |
| `http-equiv=(false)`| (initial, warning)| `<empty string>` |
| `http-equiv=(string 'true')`| (changed, warning)| `"true"` |
| `http-equiv=(string 'false')`| (changed, warning)| `"false"` |
| `http-equiv=(string 'on')`| (changed, warning)| `"on"` |
| `http-equiv=(string 'off')`| (changed, warning)| `"off"` |
| `http-equiv=(symbol)`| (initial, warning)| `<empty string>` |
| `http-equiv=(function)`| (initial, warning)| `<empty string>` |
| `http-equiv=(null)`| (initial, warning)| `<empty string>` |
| `http-equiv=(undefined)`| (initial, warning)| `<empty string>` |

## `httpEquiv` (on `<meta>` inside `<head>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `httpEquiv=(string)`| (changed)| `"a string"` |
| `httpEquiv=(empty string)`| (initial)| `<empty string>` |
| `httpEquiv=(array with string)`| (changed)| `"string"` |
| `httpEquiv=(empty array)`| (initial)| `<empty string>` |
| `httpEquiv=(object)`| (changed)| `"result of toString()"` |
| `httpEquiv=(numeric string)`| (changed)| `"42"` |
| `httpEquiv=(-1)`| (changed)| `"-1"` |
| `httpEquiv=(0)`| (changed)| `"0"` |
| `httpEquiv=(integer)`| (changed)| `"1"` |
| `httpEquiv=(NaN)`| (changed, warning)| `"NaN"` |
| `httpEquiv=(float)`| (changed)| `"99.99"` |
| `httpEquiv=(true)`| (initial, warning)| `<empty string>` |
| `httpEquiv=(false)`| (initial, warning)| `<empty string>` |
| `httpEquiv=(string 'true')`| (changed)| `"true"` |
| `httpEquiv=(string 'false')`| (changed)| `"false"` |
| `httpEquiv=(string 'on')`| (changed)| `"on"` |
| `httpEquiv=(string 'off')`| (changed)| `"off"` |
| `httpEquiv=(symbol)`| (initial, warning)| `<empty string>` |
| `httpEquiv=(function)`| (initial, warning)| `<empty string>` |
| `httpEquiv=(null)`| (initial)| `<empty string>` |
| `httpEquiv=(undefined)`| (initial)| `<empty string>` |

## `icon` (on `<command>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `icon=(string)`| (changed, warning, ssr warning)| `"a string"` |
| `icon=(empty string)`| (changed, warning, ssr warning)| `<empty string>` |
| `icon=(array with string)`| (changed, warning, ssr warning)| `"string"` |
| `icon=(empty array)`| (changed, warning, ssr warning)| `<empty string>` |
| `icon=(object)`| (changed, warning, ssr warning)| `"result of toString()"` |
| `icon=(numeric string)`| (changed, warning, ssr warning)| `"42"` |
| `icon=(-1)`| (changed, warning, ssr warning)| `"-1"` |
| `icon=(0)`| (changed, warning, ssr warning)| `"0"` |
| `icon=(integer)`| (changed, warning, ssr warning)| `"1"` |
| `icon=(NaN)`| (changed, warning)| `"NaN"` |
| `icon=(float)`| (changed, warning, ssr warning)| `"99.99"` |
| `icon=(true)`| (initial, warning)| `<null>` |
| `icon=(false)`| (initial, warning)| `<null>` |
| `icon=(string 'true')`| (changed, warning, ssr warning)| `"true"` |
| `icon=(string 'false')`| (changed, warning, ssr warning)| `"false"` |
| `icon=(string 'on')`| (changed, warning, ssr warning)| `"on"` |
| `icon=(string 'off')`| (changed, warning, ssr warning)| `"off"` |
| `icon=(symbol)`| (initial, warning)| `<null>` |
| `icon=(function)`| (initial, warning)| `<null>` |
| `icon=(null)`| (initial, warning, ssr warning)| `<null>` |
| `icon=(undefined)`| (initial, warning, ssr warning)| `<null>` |

## `id` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `id=(string)`| (changed)| `"a string"` |
| `id=(empty string)`| (initial)| `<empty string>` |
| `id=(array with string)`| (changed)| `"string"` |
| `id=(empty array)`| (initial)| `<empty string>` |
| `id=(object)`| (changed)| `"result of toString()"` |
| `id=(numeric string)`| (changed)| `"42"` |
| `id=(-1)`| (changed)| `"-1"` |
| `id=(0)`| (changed)| `"0"` |
| `id=(integer)`| (changed)| `"1"` |
| `id=(NaN)`| (changed, warning)| `"NaN"` |
| `id=(float)`| (changed)| `"99.99"` |
| `id=(true)`| (initial, warning)| `<empty string>` |
| `id=(false)`| (initial, warning)| `<empty string>` |
| `id=(string 'true')`| (changed)| `"true"` |
| `id=(string 'false')`| (changed)| `"false"` |
| `id=(string 'on')`| (changed)| `"on"` |
| `id=(string 'off')`| (changed)| `"off"` |
| `id=(symbol)`| (initial, warning)| `<empty string>` |
| `id=(function)`| (initial, warning)| `<empty string>` |
| `id=(null)`| (initial)| `<empty string>` |
| `id=(undefined)`| (initial)| `<empty string>` |

## `ID` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `ID=(string)`| (changed, warning)| `"a string"` |
| `ID=(empty string)`| (initial, warning)| `<empty string>` |
| `ID=(array with string)`| (changed, warning)| `"string"` |
| `ID=(empty array)`| (initial, warning)| `<empty string>` |
| `ID=(object)`| (changed, warning)| `"result of toString()"` |
| `ID=(numeric string)`| (changed, warning)| `"42"` |
| `ID=(-1)`| (changed, warning)| `"-1"` |
| `ID=(0)`| (changed, warning)| `"0"` |
| `ID=(integer)`| (changed, warning)| `"1"` |
| `ID=(NaN)`| (changed, warning)| `"NaN"` |
| `ID=(float)`| (changed, warning)| `"99.99"` |
| `ID=(true)`| (initial, warning)| `<empty string>` |
| `ID=(false)`| (initial, warning)| `<empty string>` |
| `ID=(string 'true')`| (changed, warning)| `"true"` |
| `ID=(string 'false')`| (changed, warning)| `"false"` |
| `ID=(string 'on')`| (changed, warning)| `"on"` |
| `ID=(string 'off')`| (changed, warning)| `"off"` |
| `ID=(symbol)`| (initial, warning)| `<empty string>` |
| `ID=(function)`| (initial, warning)| `<empty string>` |
| `ID=(null)`| (initial, warning)| `<empty string>` |
| `ID=(undefined)`| (initial, warning)| `<empty string>` |

## `ideographic` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `ideographic=(string)`| (changed)| `"a string"` |
| `ideographic=(empty string)`| (changed)| `<empty string>` |
| `ideographic=(array with string)`| (changed)| `"string"` |
| `ideographic=(empty array)`| (changed)| `<empty string>` |
| `ideographic=(object)`| (changed)| `"result of toString()"` |
| `ideographic=(numeric string)`| (changed)| `"42"` |
| `ideographic=(-1)`| (changed)| `"-1"` |
| `ideographic=(0)`| (changed)| `"0"` |
| `ideographic=(integer)`| (changed)| `"1"` |
| `ideographic=(NaN)`| (changed, warning)| `"NaN"` |
| `ideographic=(float)`| (changed)| `"99.99"` |
| `ideographic=(true)`| (initial, warning)| `<null>` |
| `ideographic=(false)`| (initial, warning)| `<null>` |
| `ideographic=(string 'true')`| (changed)| `"true"` |
| `ideographic=(string 'false')`| (changed)| `"false"` |
| `ideographic=(string 'on')`| (changed)| `"on"` |
| `ideographic=(string 'off')`| (changed)| `"off"` |
| `ideographic=(symbol)`| (initial, warning)| `<null>` |
| `ideographic=(function)`| (initial, warning)| `<null>` |
| `ideographic=(null)`| (initial)| `<null>` |
| `ideographic=(undefined)`| (initial)| `<null>` |

## `image-rendering` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `image-rendering=(string)`| (changed, warning)| `"a string"` |
| `image-rendering=(empty string)`| (changed, warning)| `<empty string>` |
| `image-rendering=(array with string)`| (changed, warning)| `"string"` |
| `image-rendering=(empty array)`| (changed, warning)| `<empty string>` |
| `image-rendering=(object)`| (changed, warning)| `"result of toString()"` |
| `image-rendering=(numeric string)`| (changed, warning)| `"42"` |
| `image-rendering=(-1)`| (changed, warning)| `"-1"` |
| `image-rendering=(0)`| (changed, warning)| `"0"` |
| `image-rendering=(integer)`| (changed, warning)| `"1"` |
| `image-rendering=(NaN)`| (changed, warning)| `"NaN"` |
| `image-rendering=(float)`| (changed, warning)| `"99.99"` |
| `image-rendering=(true)`| (initial, warning)| `<null>` |
| `image-rendering=(false)`| (initial, warning)| `<null>` |
| `image-rendering=(string 'true')`| (changed, warning)| `"true"` |
| `image-rendering=(string 'false')`| (changed, warning)| `"false"` |
| `image-rendering=(string 'on')`| (changed, warning)| `"on"` |
| `image-rendering=(string 'off')`| (changed, warning)| `"off"` |
| `image-rendering=(symbol)`| (initial, warning)| `<null>` |
| `image-rendering=(function)`| (initial, warning)| `<null>` |
| `image-rendering=(null)`| (initial, warning)| `<null>` |
| `image-rendering=(undefined)`| (initial, warning)| `<null>` |

## `imageRendering` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `imageRendering=(string)`| (changed)| `"a string"` |
| `imageRendering=(empty string)`| (changed)| `<empty string>` |
| `imageRendering=(array with string)`| (changed)| `"string"` |
| `imageRendering=(empty array)`| (changed)| `<empty string>` |
| `imageRendering=(object)`| (changed)| `"result of toString()"` |
| `imageRendering=(numeric string)`| (changed)| `"42"` |
| `imageRendering=(-1)`| (changed)| `"-1"` |
| `imageRendering=(0)`| (changed)| `"0"` |
| `imageRendering=(integer)`| (changed)| `"1"` |
| `imageRendering=(NaN)`| (changed, warning)| `"NaN"` |
| `imageRendering=(float)`| (changed)| `"99.99"` |
| `imageRendering=(true)`| (initial, warning)| `<null>` |
| `imageRendering=(false)`| (initial, warning)| `<null>` |
| `imageRendering=(string 'true')`| (changed)| `"true"` |
| `imageRendering=(string 'false')`| (changed)| `"false"` |
| `imageRendering=(string 'on')`| (changed)| `"on"` |
| `imageRendering=(string 'off')`| (changed)| `"off"` |
| `imageRendering=(symbol)`| (initial, warning)| `<null>` |
| `imageRendering=(function)`| (initial, warning)| `<null>` |
| `imageRendering=(null)`| (initial)| `<null>` |
| `imageRendering=(undefined)`| (initial)| `<null>` |

## `imageSizes` (on `<link>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `imageSizes=(string)`| (changed)| `"a string"` |
| `imageSizes=(empty string)`| (initial)| `<empty string>` |
| `imageSizes=(array with string)`| (changed)| `"string"` |
| `imageSizes=(empty array)`| (initial)| `<empty string>` |
| `imageSizes=(object)`| (changed)| `"result of toString()"` |
| `imageSizes=(numeric string)`| (changed)| `"42"` |
| `imageSizes=(-1)`| (changed)| `"-1"` |
| `imageSizes=(0)`| (changed)| `"0"` |
| `imageSizes=(integer)`| (changed)| `"1"` |
| `imageSizes=(NaN)`| (changed, warning)| `"NaN"` |
| `imageSizes=(float)`| (changed)| `"99.99"` |
| `imageSizes=(true)`| (initial, warning)| `<empty string>` |
| `imageSizes=(false)`| (initial, warning)| `<empty string>` |
| `imageSizes=(string 'true')`| (changed)| `"true"` |
| `imageSizes=(string 'false')`| (changed)| `"false"` |
| `imageSizes=(string 'on')`| (changed)| `"on"` |
| `imageSizes=(string 'off')`| (changed)| `"off"` |
| `imageSizes=(symbol)`| (initial, warning)| `<empty string>` |
| `imageSizes=(function)`| (initial, warning)| `<empty string>` |
| `imageSizes=(null)`| (initial)| `<empty string>` |
| `imageSizes=(undefined)`| (initial)| `<empty string>` |

## `imageSrcSet` (on `<link>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `imageSrcSet=(string)`| (changed)| `"a string"` |
| `imageSrcSet=(empty string)`| (initial)| `<empty string>` |
| `imageSrcSet=(array with string)`| (changed)| `"string"` |
| `imageSrcSet=(empty array)`| (initial)| `<empty string>` |
| `imageSrcSet=(object)`| (changed)| `"result of toString()"` |
| `imageSrcSet=(numeric string)`| (changed)| `"42"` |
| `imageSrcSet=(-1)`| (changed)| `"-1"` |
| `imageSrcSet=(0)`| (changed)| `"0"` |
| `imageSrcSet=(integer)`| (changed)| `"1"` |
| `imageSrcSet=(NaN)`| (changed, warning)| `"NaN"` |
| `imageSrcSet=(float)`| (changed)| `"99.99"` |
| `imageSrcSet=(true)`| (initial, warning)| `<empty string>` |
| `imageSrcSet=(false)`| (initial, warning)| `<empty string>` |
| `imageSrcSet=(string 'true')`| (changed)| `"true"` |
| `imageSrcSet=(string 'false')`| (changed)| `"false"` |
| `imageSrcSet=(string 'on')`| (changed)| `"on"` |
| `imageSrcSet=(string 'off')`| (changed)| `"off"` |
| `imageSrcSet=(symbol)`| (initial, warning)| `<empty string>` |
| `imageSrcSet=(function)`| (initial, warning)| `<empty string>` |
| `imageSrcSet=(null)`| (initial)| `<empty string>` |
| `imageSrcSet=(undefined)`| (initial)| `<empty string>` |

## `in` (on `<feBlend>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `in=(string)`| (changed)| `"a string"` |
| `in=(empty string)`| (changed)| `<empty string>` |
| `in=(array with string)`| (changed)| `"string"` |
| `in=(empty array)`| (changed)| `<empty string>` |
| `in=(object)`| (changed)| `"result of toString()"` |
| `in=(numeric string)`| (changed)| `"42"` |
| `in=(-1)`| (changed)| `"-1"` |
| `in=(0)`| (changed)| `"0"` |
| `in=(integer)`| (changed)| `"1"` |
| `in=(NaN)`| (changed, warning)| `"NaN"` |
| `in=(float)`| (changed)| `"99.99"` |
| `in=(true)`| (initial, warning)| `<null>` |
| `in=(false)`| (initial, warning)| `<null>` |
| `in=(string 'true')`| (changed)| `"true"` |
| `in=(string 'false')`| (changed)| `"false"` |
| `in=(string 'on')`| (changed)| `"on"` |
| `in=(string 'off')`| (changed)| `"off"` |
| `in=(symbol)`| (initial, warning)| `<null>` |
| `in=(function)`| (initial, warning)| `<null>` |
| `in=(null)`| (initial)| `<null>` |
| `in=(undefined)`| (initial)| `<null>` |

## `inert` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `inert=(string)`| (changed)| `<boolean: true>` |
| `inert=(empty string)`| (initial, warning)| `<boolean: false>` |
| `inert=(array with string)`| (changed)| `<boolean: true>` |
| `inert=(empty array)`| (changed)| `<boolean: true>` |
| `inert=(object)`| (changed)| `<boolean: true>` |
| `inert=(numeric string)`| (changed)| `<boolean: true>` |
| `inert=(-1)`| (changed)| `<boolean: true>` |
| `inert=(0)`| (initial)| `<boolean: false>` |
| `inert=(integer)`| (changed)| `<boolean: true>` |
| `inert=(NaN)`| (initial, warning)| `<boolean: false>` |
| `inert=(float)`| (changed)| `<boolean: true>` |
| `inert=(true)`| (changed)| `<boolean: true>` |
| `inert=(false)`| (initial)| `<boolean: false>` |
| `inert=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `inert=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `inert=(string 'on')`| (changed)| `<boolean: true>` |
| `inert=(string 'off')`| (changed)| `<boolean: true>` |
| `inert=(symbol)`| (initial, warning)| `<boolean: false>` |
| `inert=(function)`| (initial, warning)| `<boolean: false>` |
| `inert=(null)`| (initial)| `<boolean: false>` |
| `inert=(undefined)`| (initial)| `<boolean: false>` |

## `in2` (on `<feBlend>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `in2=(string)`| (changed)| `"a string"` |
| `in2=(empty string)`| (initial)| `<empty string>` |
| `in2=(array with string)`| (changed)| `"string"` |
| `in2=(empty array)`| (initial)| `<empty string>` |
| `in2=(object)`| (changed)| `"result of toString()"` |
| `in2=(numeric string)`| (changed)| `"42"` |
| `in2=(-1)`| (changed)| `"-1"` |
| `in2=(0)`| (changed)| `"0"` |
| `in2=(integer)`| (changed)| `"1"` |
| `in2=(NaN)`| (changed, warning)| `"NaN"` |
| `in2=(float)`| (changed)| `"99.99"` |
| `in2=(true)`| (initial, warning)| `<empty string>` |
| `in2=(false)`| (initial, warning)| `<empty string>` |
| `in2=(string 'true')`| (changed)| `"true"` |
| `in2=(string 'false')`| (changed)| `"false"` |
| `in2=(string 'on')`| (changed)| `"on"` |
| `in2=(string 'off')`| (changed)| `"off"` |
| `in2=(symbol)`| (initial, warning)| `<empty string>` |
| `in2=(function)`| (initial, warning)| `<empty string>` |
| `in2=(null)`| (initial)| `<empty string>` |
| `in2=(undefined)`| (initial)| `<empty string>` |

## `initialChecked` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `initialChecked=(string)`| (changed, warning)| `"a string"` |
| `initialChecked=(empty string)`| (changed, warning)| `<empty string>` |
| `initialChecked=(array with string)`| (changed, warning)| `"string"` |
| `initialChecked=(empty array)`| (changed, warning)| `<empty string>` |
| `initialChecked=(object)`| (changed, warning)| `"result of toString()"` |
| `initialChecked=(numeric string)`| (changed, warning)| `"42"` |
| `initialChecked=(-1)`| (changed, warning)| `"-1"` |
| `initialChecked=(0)`| (changed, warning)| `"0"` |
| `initialChecked=(integer)`| (changed, warning)| `"1"` |
| `initialChecked=(NaN)`| (changed, warning)| `"NaN"` |
| `initialChecked=(float)`| (changed, warning)| `"99.99"` |
| `initialChecked=(true)`| (initial, warning)| `<null>` |
| `initialChecked=(false)`| (initial, warning)| `<null>` |
| `initialChecked=(string 'true')`| (changed, warning)| `"true"` |
| `initialChecked=(string 'false')`| (changed, warning)| `"false"` |
| `initialChecked=(string 'on')`| (changed, warning)| `"on"` |
| `initialChecked=(string 'off')`| (changed, warning)| `"off"` |
| `initialChecked=(symbol)`| (initial, warning)| `<null>` |
| `initialChecked=(function)`| (initial, warning)| `<null>` |
| `initialChecked=(null)`| (initial, warning)| `<null>` |
| `initialChecked=(undefined)`| (initial, warning)| `<null>` |

## `initialValue` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `initialValue=(string)`| (changed, warning)| `"a string"` |
| `initialValue=(empty string)`| (changed, warning)| `<empty string>` |
| `initialValue=(array with string)`| (changed, warning)| `"string"` |
| `initialValue=(empty array)`| (changed, warning)| `<empty string>` |
| `initialValue=(object)`| (changed, warning)| `"result of toString()"` |
| `initialValue=(numeric string)`| (changed, warning)| `"42"` |
| `initialValue=(-1)`| (changed, warning)| `"-1"` |
| `initialValue=(0)`| (changed, warning)| `"0"` |
| `initialValue=(integer)`| (changed, warning)| `"1"` |
| `initialValue=(NaN)`| (changed, warning)| `"NaN"` |
| `initialValue=(float)`| (changed, warning)| `"99.99"` |
| `initialValue=(true)`| (initial, warning)| `<null>` |
| `initialValue=(false)`| (initial, warning)| `<null>` |
| `initialValue=(string 'true')`| (changed, warning)| `"true"` |
| `initialValue=(string 'false')`| (changed, warning)| `"false"` |
| `initialValue=(string 'on')`| (changed, warning)| `"on"` |
| `initialValue=(string 'off')`| (changed, warning)| `"off"` |
| `initialValue=(symbol)`| (initial, warning)| `<null>` |
| `initialValue=(function)`| (initial, warning)| `<null>` |
| `initialValue=(null)`| (initial, warning)| `<null>` |
| `initialValue=(undefined)`| (initial, warning)| `<null>` |

## `inlist` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `inlist=(string)`| (changed)| `"a string"` |
| `inlist=(empty string)`| (changed)| `<empty string>` |
| `inlist=(array with string)`| (changed)| `"string"` |
| `inlist=(empty array)`| (changed)| `<empty string>` |
| `inlist=(object)`| (changed)| `"result of toString()"` |
| `inlist=(numeric string)`| (changed)| `"42"` |
| `inlist=(-1)`| (changed)| `"-1"` |
| `inlist=(0)`| (changed)| `"0"` |
| `inlist=(integer)`| (changed)| `"1"` |
| `inlist=(NaN)`| (changed, warning)| `"NaN"` |
| `inlist=(float)`| (changed)| `"99.99"` |
| `inlist=(true)`| (initial, warning)| `<null>` |
| `inlist=(false)`| (initial, warning)| `<null>` |
| `inlist=(string 'true')`| (changed)| `"true"` |
| `inlist=(string 'false')`| (changed)| `"false"` |
| `inlist=(string 'on')`| (changed)| `"on"` |
| `inlist=(string 'off')`| (changed)| `"off"` |
| `inlist=(symbol)`| (initial, warning)| `<null>` |
| `inlist=(function)`| (initial, warning)| `<null>` |
| `inlist=(null)`| (initial)| `<null>` |
| `inlist=(undefined)`| (initial)| `<null>` |

## `inputMode` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `inputMode=(string)`| (initial)| `<empty string>` |
| `inputMode=(empty string)`| (initial)| `<empty string>` |
| `inputMode=(array with string)`| (initial)| `<empty string>` |
| `inputMode=(empty array)`| (initial)| `<empty string>` |
| `inputMode=(object)`| (initial)| `<empty string>` |
| `inputMode=(numeric string)`| (initial)| `<empty string>` |
| `inputMode=(-1)`| (initial)| `<empty string>` |
| `inputMode=(0)`| (initial)| `<empty string>` |
| `inputMode=(integer)`| (initial)| `<empty string>` |
| `inputMode=(NaN)`| (initial, warning)| `<empty string>` |
| `inputMode=(float)`| (initial)| `<empty string>` |
| `inputMode=(true)`| (initial, warning)| `<empty string>` |
| `inputMode=(false)`| (initial, warning)| `<empty string>` |
| `inputMode=(string 'true')`| (initial)| `<empty string>` |
| `inputMode=(string 'false')`| (initial)| `<empty string>` |
| `inputMode=(string 'on')`| (initial)| `<empty string>` |
| `inputMode=(string 'off')`| (initial)| `<empty string>` |
| `inputMode=(symbol)`| (initial, warning)| `<empty string>` |
| `inputMode=(function)`| (initial, warning)| `<empty string>` |
| `inputMode=(null)`| (initial)| `<empty string>` |
| `inputMode=(undefined)`| (initial)| `<empty string>` |

## `integrity` (on `<script>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `integrity=(string)`| (changed)| `"a string"` |
| `integrity=(empty string)`| (initial)| `<empty string>` |
| `integrity=(array with string)`| (changed)| `"string"` |
| `integrity=(empty array)`| (initial)| `<empty string>` |
| `integrity=(object)`| (changed)| `"result of toString()"` |
| `integrity=(numeric string)`| (changed)| `"42"` |
| `integrity=(-1)`| (changed)| `"-1"` |
| `integrity=(0)`| (changed)| `"0"` |
| `integrity=(integer)`| (changed)| `"1"` |
| `integrity=(NaN)`| (changed, warning)| `"NaN"` |
| `integrity=(float)`| (changed)| `"99.99"` |
| `integrity=(true)`| (initial, warning)| `<empty string>` |
| `integrity=(false)`| (initial, warning)| `<empty string>` |
| `integrity=(string 'true')`| (changed)| `"true"` |
| `integrity=(string 'false')`| (changed)| `"false"` |
| `integrity=(string 'on')`| (changed)| `"on"` |
| `integrity=(string 'off')`| (changed)| `"off"` |
| `integrity=(symbol)`| (initial, warning)| `<empty string>` |
| `integrity=(function)`| (initial, warning)| `<empty string>` |
| `integrity=(null)`| (initial)| `<empty string>` |
| `integrity=(undefined)`| (initial)| `<empty string>` |

## `intercept` (on `<feFuncA>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `intercept=(string)`| (initial)| `<number: 0>` |
| `intercept=(empty string)`| (initial)| `<number: 0>` |
| `intercept=(array with string)`| (initial)| `<number: 0>` |
| `intercept=(empty array)`| (initial)| `<number: 0>` |
| `intercept=(object)`| (initial)| `<number: 0>` |
| `intercept=(numeric string)`| (changed)| `<number: 42>` |
| `intercept=(-1)`| (changed)| `<number: -1>` |
| `intercept=(0)`| (initial)| `<number: 0>` |
| `intercept=(integer)`| (changed)| `<number: 1>` |
| `intercept=(NaN)`| (initial, warning)| `<number: 0>` |
| `intercept=(float)`| (changed)| `<number: 99.98999786376953>` |
| `intercept=(true)`| (initial, warning)| `<number: 0>` |
| `intercept=(false)`| (initial, warning)| `<number: 0>` |
| `intercept=(string 'true')`| (initial)| `<number: 0>` |
| `intercept=(string 'false')`| (initial)| `<number: 0>` |
| `intercept=(string 'on')`| (initial)| `<number: 0>` |
| `intercept=(string 'off')`| (initial)| `<number: 0>` |
| `intercept=(symbol)`| (initial, warning)| `<number: 0>` |
| `intercept=(function)`| (initial, warning)| `<number: 0>` |
| `intercept=(null)`| (initial)| `<number: 0>` |
| `intercept=(undefined)`| (initial)| `<number: 0>` |

## `is` (on `<button>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `is=(string)`| (changed)| `"x-test-element"` |
| `is=(empty string)`| (changed)| `<empty string>` |
| `is=(array with string)`| (changed, warning)| `"x-test-element"` |
| `is=(empty array)`| (changed, warning)| `<empty string>` |
| `is=(object)`| (changed, warning)| `"result of toString()"` |
| `is=(numeric string)`| (changed)| `"42"` |
| `is=(-1)`| (changed, warning)| `"-1"` |
| `is=(0)`| (changed, warning)| `"0"` |
| `is=(integer)`| (changed, warning)| `"1"` |
| `is=(NaN)`| (changed, warning)| `"NaN"` |
| `is=(float)`| (changed, warning)| `"99.99"` |
| `is=(true)`| (initial, warning)| `<null>` |
| `is=(false)`| (initial, warning)| `<null>` |
| `is=(string 'true')`| (changed)| `"true"` |
| `is=(string 'false')`| (changed)| `"false"` |
| `is=(string 'on')`| (changed)| `"on"` |
| `is=(string 'off')`| (changed)| `"off"` |
| `is=(symbol)`| (initial, warning)| `<null>` |
| `is=(function)`| (initial, warning)| `<null>` |
| `is=(null)`| (initial)| `<null>` |
| `is=(undefined)`| (initial)| `<null>` |

## `itemID` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `itemID=(string)`| (changed)| `"a string"` |
| `itemID=(empty string)`| (changed)| `<empty string>` |
| `itemID=(array with string)`| (changed)| `"string"` |
| `itemID=(empty array)`| (changed)| `<empty string>` |
| `itemID=(object)`| (changed)| `"result of toString()"` |
| `itemID=(numeric string)`| (changed)| `"42"` |
| `itemID=(-1)`| (changed)| `"-1"` |
| `itemID=(0)`| (changed)| `"0"` |
| `itemID=(integer)`| (changed)| `"1"` |
| `itemID=(NaN)`| (changed, warning)| `"NaN"` |
| `itemID=(float)`| (changed)| `"99.99"` |
| `itemID=(true)`| (initial, warning)| `<null>` |
| `itemID=(false)`| (initial, warning)| `<null>` |
| `itemID=(string 'true')`| (changed)| `"true"` |
| `itemID=(string 'false')`| (changed)| `"false"` |
| `itemID=(string 'on')`| (changed)| `"on"` |
| `itemID=(string 'off')`| (changed)| `"off"` |
| `itemID=(symbol)`| (initial, warning)| `<null>` |
| `itemID=(function)`| (initial, warning)| `<null>` |
| `itemID=(null)`| (initial)| `<null>` |
| `itemID=(undefined)`| (initial)| `<null>` |

## `itemProp` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `itemProp=(string)`| (changed)| `"a string"` |
| `itemProp=(empty string)`| (changed)| `<empty string>` |
| `itemProp=(array with string)`| (changed)| `"string"` |
| `itemProp=(empty array)`| (changed)| `<empty string>` |
| `itemProp=(object)`| (changed)| `"result of toString()"` |
| `itemProp=(numeric string)`| (changed)| `"42"` |
| `itemProp=(-1)`| (changed)| `"-1"` |
| `itemProp=(0)`| (changed)| `"0"` |
| `itemProp=(integer)`| (changed)| `"1"` |
| `itemProp=(NaN)`| (changed, warning)| `"NaN"` |
| `itemProp=(float)`| (changed)| `"99.99"` |
| `itemProp=(true)`| (initial, warning)| `<null>` |
| `itemProp=(false)`| (initial, warning)| `<null>` |
| `itemProp=(string 'true')`| (changed)| `"true"` |
| `itemProp=(string 'false')`| (changed)| `"false"` |
| `itemProp=(string 'on')`| (changed)| `"on"` |
| `itemProp=(string 'off')`| (changed)| `"off"` |
| `itemProp=(symbol)`| (initial, warning)| `<null>` |
| `itemProp=(function)`| (initial, warning)| `<null>` |
| `itemProp=(null)`| (initial)| `<null>` |
| `itemProp=(undefined)`| (initial)| `<null>` |

## `itemRef` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `itemRef=(string)`| (changed)| `"a string"` |
| `itemRef=(empty string)`| (changed)| `<empty string>` |
| `itemRef=(array with string)`| (changed)| `"string"` |
| `itemRef=(empty array)`| (changed)| `<empty string>` |
| `itemRef=(object)`| (changed)| `"result of toString()"` |
| `itemRef=(numeric string)`| (changed)| `"42"` |
| `itemRef=(-1)`| (changed)| `"-1"` |
| `itemRef=(0)`| (changed)| `"0"` |
| `itemRef=(integer)`| (changed)| `"1"` |
| `itemRef=(NaN)`| (changed, warning)| `"NaN"` |
| `itemRef=(float)`| (changed)| `"99.99"` |
| `itemRef=(true)`| (initial, warning)| `<null>` |
| `itemRef=(false)`| (initial, warning)| `<null>` |
| `itemRef=(string 'true')`| (changed)| `"true"` |
| `itemRef=(string 'false')`| (changed)| `"false"` |
| `itemRef=(string 'on')`| (changed)| `"on"` |
| `itemRef=(string 'off')`| (changed)| `"off"` |
| `itemRef=(symbol)`| (initial, warning)| `<null>` |
| `itemRef=(function)`| (initial, warning)| `<null>` |
| `itemRef=(null)`| (initial)| `<null>` |
| `itemRef=(undefined)`| (initial)| `<null>` |

## `itemScope` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `itemScope=(string)`| (changed)| `<empty string>` |
| `itemScope=(empty string)`| (initial)| `<null>` |
| `itemScope=(array with string)`| (changed)| `<empty string>` |
| `itemScope=(empty array)`| (changed)| `<empty string>` |
| `itemScope=(object)`| (changed)| `<empty string>` |
| `itemScope=(numeric string)`| (changed)| `<empty string>` |
| `itemScope=(-1)`| (changed)| `<empty string>` |
| `itemScope=(0)`| (initial)| `<null>` |
| `itemScope=(integer)`| (changed)| `<empty string>` |
| `itemScope=(NaN)`| (initial, warning)| `<null>` |
| `itemScope=(float)`| (changed)| `<empty string>` |
| `itemScope=(true)`| (changed)| `<empty string>` |
| `itemScope=(false)`| (initial)| `<null>` |
| `itemScope=(string 'true')`| (changed, warning)| `<empty string>` |
| `itemScope=(string 'false')`| (changed, warning)| `<empty string>` |
| `itemScope=(string 'on')`| (changed)| `<empty string>` |
| `itemScope=(string 'off')`| (changed)| `<empty string>` |
| `itemScope=(symbol)`| (initial, warning)| `<null>` |
| `itemScope=(function)`| (initial, warning)| `<null>` |
| `itemScope=(null)`| (initial)| `<null>` |
| `itemScope=(undefined)`| (initial)| `<null>` |

## `itemType` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `itemType=(string)`| (changed)| `"a string"` |
| `itemType=(empty string)`| (changed)| `<empty string>` |
| `itemType=(array with string)`| (changed)| `"string"` |
| `itemType=(empty array)`| (changed)| `<empty string>` |
| `itemType=(object)`| (changed)| `"result of toString()"` |
| `itemType=(numeric string)`| (changed)| `"42"` |
| `itemType=(-1)`| (changed)| `"-1"` |
| `itemType=(0)`| (changed)| `"0"` |
| `itemType=(integer)`| (changed)| `"1"` |
| `itemType=(NaN)`| (changed, warning)| `"NaN"` |
| `itemType=(float)`| (changed)| `"99.99"` |
| `itemType=(true)`| (initial, warning)| `<null>` |
| `itemType=(false)`| (initial, warning)| `<null>` |
| `itemType=(string 'true')`| (changed)| `"true"` |
| `itemType=(string 'false')`| (changed)| `"false"` |
| `itemType=(string 'on')`| (changed)| `"on"` |
| `itemType=(string 'off')`| (changed)| `"off"` |
| `itemType=(symbol)`| (initial, warning)| `<null>` |
| `itemType=(function)`| (initial, warning)| `<null>` |
| `itemType=(null)`| (initial)| `<null>` |
| `itemType=(undefined)`| (initial)| `<null>` |

## `k` (on `<hkern>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `k=(string)`| (changed)| `"a string"` |
| `k=(empty string)`| (changed)| `<empty string>` |
| `k=(array with string)`| (changed)| `"string"` |
| `k=(empty array)`| (changed)| `<empty string>` |
| `k=(object)`| (changed)| `"result of toString()"` |
| `k=(numeric string)`| (changed)| `"42"` |
| `k=(-1)`| (changed)| `"-1"` |
| `k=(0)`| (changed)| `"0"` |
| `k=(integer)`| (changed)| `"1"` |
| `k=(NaN)`| (changed, warning)| `"NaN"` |
| `k=(float)`| (changed)| `"99.99"` |
| `k=(true)`| (initial, warning)| `<null>` |
| `k=(false)`| (initial, warning)| `<null>` |
| `k=(string 'true')`| (changed)| `"true"` |
| `k=(string 'false')`| (changed)| `"false"` |
| `k=(string 'on')`| (changed)| `"on"` |
| `k=(string 'off')`| (changed)| `"off"` |
| `k=(symbol)`| (initial, warning)| `<null>` |
| `k=(function)`| (initial, warning)| `<null>` |
| `k=(null)`| (initial)| `<null>` |
| `k=(undefined)`| (initial)| `<null>` |

## `K` (on `<hkern>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `K=(string)`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(empty string)`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(array with string)`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(empty array)`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(object)`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(numeric string)`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(-1)`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(0)`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(integer)`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(NaN)`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(float)`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(true)`| (initial, warning)| `<null>` |
| `K=(false)`| (initial, warning)| `<null>` |
| `K=(string 'true')`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(string 'false')`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(string 'on')`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(string 'off')`| (initial, warning, ssr mismatch)| `<null>` |
| `K=(symbol)`| (initial, warning)| `<null>` |
| `K=(function)`| (initial, warning)| `<null>` |
| `K=(null)`| (initial, warning)| `<null>` |
| `K=(undefined)`| (initial, warning)| `<null>` |

## `K1` (on `<feComposite>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `K1=(string)`| (initial, warning)| `<number: 0>` |
| `K1=(empty string)`| (initial, warning)| `<number: 0>` |
| `K1=(array with string)`| (initial, warning)| `<number: 0>` |
| `K1=(empty array)`| (initial, warning)| `<number: 0>` |
| `K1=(object)`| (initial, warning)| `<number: 0>` |
| `K1=(numeric string)`| (initial, warning, ssr mismatch)| `<number: 0>` |
| `K1=(-1)`| (initial, warning, ssr mismatch)| `<number: 0>` |
| `K1=(0)`| (initial, warning)| `<number: 0>` |
| `K1=(integer)`| (initial, warning, ssr mismatch)| `<number: 0>` |
| `K1=(NaN)`| (initial, warning)| `<number: 0>` |
| `K1=(float)`| (initial, warning, ssr mismatch)| `<number: 0>` |
| `K1=(true)`| (initial, warning)| `<number: 0>` |
| `K1=(false)`| (initial, warning)| `<number: 0>` |
| `K1=(string 'true')`| (initial, warning)| `<number: 0>` |
| `K1=(string 'false')`| (initial, warning)| `<number: 0>` |
| `K1=(string 'on')`| (initial, warning)| `<number: 0>` |
| `K1=(string 'off')`| (initial, warning)| `<number: 0>` |
| `K1=(symbol)`| (initial, warning)| `<number: 0>` |
| `K1=(function)`| (initial, warning)| `<number: 0>` |
| `K1=(null)`| (initial, warning)| `<number: 0>` |
| `K1=(undefined)`| (initial, warning)| `<number: 0>` |

## `k1` (on `<feComposite>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `k1=(string)`| (initial)| `<number: 0>` |
| `k1=(empty string)`| (initial)| `<number: 0>` |
| `k1=(array with string)`| (initial)| `<number: 0>` |
| `k1=(empty array)`| (initial)| `<number: 0>` |
| `k1=(object)`| (initial)| `<number: 0>` |
| `k1=(numeric string)`| (changed)| `<number: 42>` |
| `k1=(-1)`| (changed)| `<number: -1>` |
| `k1=(0)`| (initial)| `<number: 0>` |
| `k1=(integer)`| (changed)| `<number: 1>` |
| `k1=(NaN)`| (initial, warning)| `<number: 0>` |
| `k1=(float)`| (changed)| `<number: 99.98999786376953>` |
| `k1=(true)`| (initial, warning)| `<number: 0>` |
| `k1=(false)`| (initial, warning)| `<number: 0>` |
| `k1=(string 'true')`| (initial)| `<number: 0>` |
| `k1=(string 'false')`| (initial)| `<number: 0>` |
| `k1=(string 'on')`| (initial)| `<number: 0>` |
| `k1=(string 'off')`| (initial)| `<number: 0>` |
| `k1=(symbol)`| (initial, warning)| `<number: 0>` |
| `k1=(function)`| (initial, warning)| `<number: 0>` |
| `k1=(null)`| (initial)| `<number: 0>` |
| `k1=(undefined)`| (initial)| `<number: 0>` |

## `k2` (on `<feComposite>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `k2=(string)`| (initial)| `<number: 0>` |
| `k2=(empty string)`| (initial)| `<number: 0>` |
| `k2=(array with string)`| (initial)| `<number: 0>` |
| `k2=(empty array)`| (initial)| `<number: 0>` |
| `k2=(object)`| (initial)| `<number: 0>` |
| `k2=(numeric string)`| (changed)| `<number: 42>` |
| `k2=(-1)`| (changed)| `<number: -1>` |
| `k2=(0)`| (initial)| `<number: 0>` |
| `k2=(integer)`| (changed)| `<number: 1>` |
| `k2=(NaN)`| (initial, warning)| `<number: 0>` |
| `k2=(float)`| (changed)| `<number: 99.98999786376953>` |
| `k2=(true)`| (initial, warning)| `<number: 0>` |
| `k2=(false)`| (initial, warning)| `<number: 0>` |
| `k2=(string 'true')`| (initial)| `<number: 0>` |
| `k2=(string 'false')`| (initial)| `<number: 0>` |
| `k2=(string 'on')`| (initial)| `<number: 0>` |
| `k2=(string 'off')`| (initial)| `<number: 0>` |
| `k2=(symbol)`| (initial, warning)| `<number: 0>` |
| `k2=(function)`| (initial, warning)| `<number: 0>` |
| `k2=(null)`| (initial)| `<number: 0>` |
| `k2=(undefined)`| (initial)| `<number: 0>` |

## `k3` (on `<feComposite>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `k3=(string)`| (initial)| `<number: 0>` |
| `k3=(empty string)`| (initial)| `<number: 0>` |
| `k3=(array with string)`| (initial)| `<number: 0>` |
| `k3=(empty array)`| (initial)| `<number: 0>` |
| `k3=(object)`| (initial)| `<number: 0>` |
| `k3=(numeric string)`| (changed)| `<number: 42>` |
| `k3=(-1)`| (changed)| `<number: -1>` |
| `k3=(0)`| (initial)| `<number: 0>` |
| `k3=(integer)`| (changed)| `<number: 1>` |
| `k3=(NaN)`| (initial, warning)| `<number: 0>` |
| `k3=(float)`| (changed)| `<number: 99.98999786376953>` |
| `k3=(true)`| (initial, warning)| `<number: 0>` |
| `k3=(false)`| (initial, warning)| `<number: 0>` |
| `k3=(string 'true')`| (initial)| `<number: 0>` |
| `k3=(string 'false')`| (initial)| `<number: 0>` |
| `k3=(string 'on')`| (initial)| `<number: 0>` |
| `k3=(string 'off')`| (initial)| `<number: 0>` |
| `k3=(symbol)`| (initial, warning)| `<number: 0>` |
| `k3=(function)`| (initial, warning)| `<number: 0>` |
| `k3=(null)`| (initial)| `<number: 0>` |
| `k3=(undefined)`| (initial)| `<number: 0>` |

## `k4` (on `<feComposite>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `k4=(string)`| (initial)| `<number: 0>` |
| `k4=(empty string)`| (initial)| `<number: 0>` |
| `k4=(array with string)`| (initial)| `<number: 0>` |
| `k4=(empty array)`| (initial)| `<number: 0>` |
| `k4=(object)`| (initial)| `<number: 0>` |
| `k4=(numeric string)`| (changed)| `<number: 42>` |
| `k4=(-1)`| (changed)| `<number: -1>` |
| `k4=(0)`| (initial)| `<number: 0>` |
| `k4=(integer)`| (changed)| `<number: 1>` |
| `k4=(NaN)`| (initial, warning)| `<number: 0>` |
| `k4=(float)`| (changed)| `<number: 99.98999786376953>` |
| `k4=(true)`| (initial, warning)| `<number: 0>` |
| `k4=(false)`| (initial, warning)| `<number: 0>` |
| `k4=(string 'true')`| (initial)| `<number: 0>` |
| `k4=(string 'false')`| (initial)| `<number: 0>` |
| `k4=(string 'on')`| (initial)| `<number: 0>` |
| `k4=(string 'off')`| (initial)| `<number: 0>` |
| `k4=(symbol)`| (initial, warning)| `<number: 0>` |
| `k4=(function)`| (initial, warning)| `<number: 0>` |
| `k4=(null)`| (initial)| `<number: 0>` |
| `k4=(undefined)`| (initial)| `<number: 0>` |

## `kernelMatrix` (on `<feConvolveMatrix>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `kernelMatrix=(string)`| (changed)| `[1, 2, 3, 4]` |
| `kernelMatrix=(empty string)`| (initial)| `[]` |
| `kernelMatrix=(array with string)`| (changed)| `[1, 2, 3, 4]` |
| `kernelMatrix=(empty array)`| (initial)| `[]` |
| `kernelMatrix=(object)`| (initial)| `[]` |
| `kernelMatrix=(numeric string)`| (changed)| `[42]` |
| `kernelMatrix=(-1)`| (changed)| `[-1]` |
| `kernelMatrix=(0)`| (changed)| `[0]` |
| `kernelMatrix=(integer)`| (changed)| `[1]` |
| `kernelMatrix=(NaN)`| (initial, warning)| `[]` |
| `kernelMatrix=(float)`| (changed)| `[99.98999786376953]` |
| `kernelMatrix=(true)`| (initial, warning)| `[]` |
| `kernelMatrix=(false)`| (initial, warning)| `[]` |
| `kernelMatrix=(string 'true')`| (initial)| `[]` |
| `kernelMatrix=(string 'false')`| (initial)| `[]` |
| `kernelMatrix=(string 'on')`| (initial)| `[]` |
| `kernelMatrix=(string 'off')`| (initial)| `[]` |
| `kernelMatrix=(symbol)`| (initial, warning)| `[]` |
| `kernelMatrix=(function)`| (initial, warning)| `[]` |
| `kernelMatrix=(null)`| (initial)| `[]` |
| `kernelMatrix=(undefined)`| (initial)| `[]` |

## `kernelUnitLength` (on `<feConvolveMatrix>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `kernelUnitLength=(string)`| (changed)| `"a string"` |
| `kernelUnitLength=(empty string)`| (changed)| `<empty string>` |
| `kernelUnitLength=(array with string)`| (changed)| `"string"` |
| `kernelUnitLength=(empty array)`| (changed)| `<empty string>` |
| `kernelUnitLength=(object)`| (changed)| `"result of toString()"` |
| `kernelUnitLength=(numeric string)`| (changed)| `"42"` |
| `kernelUnitLength=(-1)`| (changed)| `"-1"` |
| `kernelUnitLength=(0)`| (changed)| `"0"` |
| `kernelUnitLength=(integer)`| (changed)| `"1"` |
| `kernelUnitLength=(NaN)`| (changed, warning)| `"NaN"` |
| `kernelUnitLength=(float)`| (changed)| `"99.99"` |
| `kernelUnitLength=(true)`| (initial, warning)| `<null>` |
| `kernelUnitLength=(false)`| (initial, warning)| `<null>` |
| `kernelUnitLength=(string 'true')`| (changed)| `"true"` |
| `kernelUnitLength=(string 'false')`| (changed)| `"false"` |
| `kernelUnitLength=(string 'on')`| (changed)| `"on"` |
| `kernelUnitLength=(string 'off')`| (changed)| `"off"` |
| `kernelUnitLength=(symbol)`| (initial, warning)| `<null>` |
| `kernelUnitLength=(function)`| (initial, warning)| `<null>` |
| `kernelUnitLength=(null)`| (initial)| `<null>` |
| `kernelUnitLength=(undefined)`| (initial)| `<null>` |

## `kerning` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `kerning=(string)`| (changed)| `"a string"` |
| `kerning=(empty string)`| (changed)| `<empty string>` |
| `kerning=(array with string)`| (changed)| `"string"` |
| `kerning=(empty array)`| (changed)| `<empty string>` |
| `kerning=(object)`| (changed)| `"result of toString()"` |
| `kerning=(numeric string)`| (changed)| `"42"` |
| `kerning=(-1)`| (changed)| `"-1"` |
| `kerning=(0)`| (changed)| `"0"` |
| `kerning=(integer)`| (changed)| `"1"` |
| `kerning=(NaN)`| (changed, warning)| `"NaN"` |
| `kerning=(float)`| (changed)| `"99.99"` |
| `kerning=(true)`| (initial, warning)| `<null>` |
| `kerning=(false)`| (initial, warning)| `<null>` |
| `kerning=(string 'true')`| (changed)| `"true"` |
| `kerning=(string 'false')`| (changed)| `"false"` |
| `kerning=(string 'on')`| (changed)| `"on"` |
| `kerning=(string 'off')`| (changed)| `"off"` |
| `kerning=(symbol)`| (initial, warning)| `<null>` |
| `kerning=(function)`| (initial, warning)| `<null>` |
| `kerning=(null)`| (initial)| `<null>` |
| `kerning=(undefined)`| (initial)| `<null>` |

## `keyParams` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `keyParams=(string)`| (changed)| `"a string"` |
| `keyParams=(empty string)`| (changed)| `<empty string>` |
| `keyParams=(array with string)`| (changed)| `"string"` |
| `keyParams=(empty array)`| (changed)| `<empty string>` |
| `keyParams=(object)`| (changed)| `"result of toString()"` |
| `keyParams=(numeric string)`| (changed)| `"42"` |
| `keyParams=(-1)`| (changed)| `"-1"` |
| `keyParams=(0)`| (changed)| `"0"` |
| `keyParams=(integer)`| (changed)| `"1"` |
| `keyParams=(NaN)`| (changed, warning)| `"NaN"` |
| `keyParams=(float)`| (changed)| `"99.99"` |
| `keyParams=(true)`| (initial, warning)| `<null>` |
| `keyParams=(false)`| (initial, warning)| `<null>` |
| `keyParams=(string 'true')`| (changed)| `"true"` |
| `keyParams=(string 'false')`| (changed)| `"false"` |
| `keyParams=(string 'on')`| (changed)| `"on"` |
| `keyParams=(string 'off')`| (changed)| `"off"` |
| `keyParams=(symbol)`| (initial, warning)| `<null>` |
| `keyParams=(function)`| (initial, warning)| `<null>` |
| `keyParams=(null)`| (initial)| `<null>` |
| `keyParams=(undefined)`| (initial)| `<null>` |

## `keyPoints` (on `<animateMotion>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `keyPoints=(string)`| (changed)| `"a string"` |
| `keyPoints=(empty string)`| (changed)| `<empty string>` |
| `keyPoints=(array with string)`| (changed)| `"string"` |
| `keyPoints=(empty array)`| (changed)| `<empty string>` |
| `keyPoints=(object)`| (changed)| `"result of toString()"` |
| `keyPoints=(numeric string)`| (changed)| `"42"` |
| `keyPoints=(-1)`| (changed)| `"-1"` |
| `keyPoints=(0)`| (changed)| `"0"` |
| `keyPoints=(integer)`| (changed)| `"1"` |
| `keyPoints=(NaN)`| (changed, warning)| `"NaN"` |
| `keyPoints=(float)`| (changed)| `"99.99"` |
| `keyPoints=(true)`| (initial, warning)| `<null>` |
| `keyPoints=(false)`| (initial, warning)| `<null>` |
| `keyPoints=(string 'true')`| (changed)| `"true"` |
| `keyPoints=(string 'false')`| (changed)| `"false"` |
| `keyPoints=(string 'on')`| (changed)| `"on"` |
| `keyPoints=(string 'off')`| (changed)| `"off"` |
| `keyPoints=(symbol)`| (initial, warning)| `<null>` |
| `keyPoints=(function)`| (initial, warning)| `<null>` |
| `keyPoints=(null)`| (initial)| `<null>` |
| `keyPoints=(undefined)`| (initial)| `<null>` |

## `keySplines` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `keySplines=(string)`| (changed)| `"a string"` |
| `keySplines=(empty string)`| (changed)| `<empty string>` |
| `keySplines=(array with string)`| (changed)| `"string"` |
| `keySplines=(empty array)`| (changed)| `<empty string>` |
| `keySplines=(object)`| (changed)| `"result of toString()"` |
| `keySplines=(numeric string)`| (changed)| `"42"` |
| `keySplines=(-1)`| (changed)| `"-1"` |
| `keySplines=(0)`| (changed)| `"0"` |
| `keySplines=(integer)`| (changed)| `"1"` |
| `keySplines=(NaN)`| (changed, warning)| `"NaN"` |
| `keySplines=(float)`| (changed)| `"99.99"` |
| `keySplines=(true)`| (initial, warning)| `<null>` |
| `keySplines=(false)`| (initial, warning)| `<null>` |
| `keySplines=(string 'true')`| (changed)| `"true"` |
| `keySplines=(string 'false')`| (changed)| `"false"` |
| `keySplines=(string 'on')`| (changed)| `"on"` |
| `keySplines=(string 'off')`| (changed)| `"off"` |
| `keySplines=(symbol)`| (initial, warning)| `<null>` |
| `keySplines=(function)`| (initial, warning)| `<null>` |
| `keySplines=(null)`| (initial)| `<null>` |
| `keySplines=(undefined)`| (initial)| `<null>` |

## `keyTimes` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `keyTimes=(string)`| (changed)| `"a string"` |
| `keyTimes=(empty string)`| (changed)| `<empty string>` |
| `keyTimes=(array with string)`| (changed)| `"string"` |
| `keyTimes=(empty array)`| (changed)| `<empty string>` |
| `keyTimes=(object)`| (changed)| `"result of toString()"` |
| `keyTimes=(numeric string)`| (changed)| `"42"` |
| `keyTimes=(-1)`| (changed)| `"-1"` |
| `keyTimes=(0)`| (changed)| `"0"` |
| `keyTimes=(integer)`| (changed)| `"1"` |
| `keyTimes=(NaN)`| (changed, warning)| `"NaN"` |
| `keyTimes=(float)`| (changed)| `"99.99"` |
| `keyTimes=(true)`| (initial, warning)| `<null>` |
| `keyTimes=(false)`| (initial, warning)| `<null>` |
| `keyTimes=(string 'true')`| (changed)| `"true"` |
| `keyTimes=(string 'false')`| (changed)| `"false"` |
| `keyTimes=(string 'on')`| (changed)| `"on"` |
| `keyTimes=(string 'off')`| (changed)| `"off"` |
| `keyTimes=(symbol)`| (initial, warning)| `<null>` |
| `keyTimes=(function)`| (initial, warning)| `<null>` |
| `keyTimes=(null)`| (initial)| `<null>` |
| `keyTimes=(undefined)`| (initial)| `<null>` |

## `keyType` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `keyType=(string)`| (changed)| `"a string"` |
| `keyType=(empty string)`| (changed)| `<empty string>` |
| `keyType=(array with string)`| (changed)| `"string"` |
| `keyType=(empty array)`| (changed)| `<empty string>` |
| `keyType=(object)`| (changed)| `"result of toString()"` |
| `keyType=(numeric string)`| (changed)| `"42"` |
| `keyType=(-1)`| (changed)| `"-1"` |
| `keyType=(0)`| (changed)| `"0"` |
| `keyType=(integer)`| (changed)| `"1"` |
| `keyType=(NaN)`| (changed, warning)| `"NaN"` |
| `keyType=(float)`| (changed)| `"99.99"` |
| `keyType=(true)`| (initial, warning)| `<null>` |
| `keyType=(false)`| (initial, warning)| `<null>` |
| `keyType=(string 'true')`| (changed)| `"true"` |
| `keyType=(string 'false')`| (changed)| `"false"` |
| `keyType=(string 'on')`| (changed)| `"on"` |
| `keyType=(string 'off')`| (changed)| `"off"` |
| `keyType=(symbol)`| (initial, warning)| `<null>` |
| `keyType=(function)`| (initial, warning)| `<null>` |
| `keyType=(null)`| (initial)| `<null>` |
| `keyType=(undefined)`| (initial)| `<null>` |

## `kind` (on `<track>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `kind=(string)`| (changed)| `"captions"` |
| `kind=(empty string)`| (changed)| `"metadata"` |
| `kind=(array with string)`| (changed)| `"captions"` |
| `kind=(empty array)`| (changed)| `"metadata"` |
| `kind=(object)`| (changed)| `"metadata"` |
| `kind=(numeric string)`| (changed)| `"metadata"` |
| `kind=(-1)`| (changed)| `"metadata"` |
| `kind=(0)`| (changed)| `"metadata"` |
| `kind=(integer)`| (changed)| `"metadata"` |
| `kind=(NaN)`| (changed, warning)| `"metadata"` |
| `kind=(float)`| (changed)| `"metadata"` |
| `kind=(true)`| (initial, warning)| `"subtitles"` |
| `kind=(false)`| (initial, warning)| `"subtitles"` |
| `kind=(string 'true')`| (changed)| `"metadata"` |
| `kind=(string 'false')`| (changed)| `"metadata"` |
| `kind=(string 'on')`| (changed)| `"metadata"` |
| `kind=(string 'off')`| (changed)| `"metadata"` |
| `kind=(symbol)`| (initial, warning)| `"subtitles"` |
| `kind=(function)`| (initial, warning)| `"subtitles"` |
| `kind=(null)`| (initial)| `"subtitles"` |
| `kind=(undefined)`| (initial)| `"subtitles"` |

## `label` (on `<track>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `label=(string)`| (changed)| `"a string"` |
| `label=(empty string)`| (initial)| `<empty string>` |
| `label=(array with string)`| (changed)| `"string"` |
| `label=(empty array)`| (initial)| `<empty string>` |
| `label=(object)`| (changed)| `"result of toString()"` |
| `label=(numeric string)`| (changed)| `"42"` |
| `label=(-1)`| (changed)| `"-1"` |
| `label=(0)`| (changed)| `"0"` |
| `label=(integer)`| (changed)| `"1"` |
| `label=(NaN)`| (changed, warning)| `"NaN"` |
| `label=(float)`| (changed)| `"99.99"` |
| `label=(true)`| (initial, warning)| `<empty string>` |
| `label=(false)`| (initial, warning)| `<empty string>` |
| `label=(string 'true')`| (changed)| `"true"` |
| `label=(string 'false')`| (changed)| `"false"` |
| `label=(string 'on')`| (changed)| `"on"` |
| `label=(string 'off')`| (changed)| `"off"` |
| `label=(symbol)`| (initial, warning)| `<empty string>` |
| `label=(function)`| (initial, warning)| `<empty string>` |
| `label=(null)`| (initial)| `<empty string>` |
| `label=(undefined)`| (initial)| `<empty string>` |

## `LANG` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `LANG=(string)`| (changed, warning)| `"a string"` |
| `LANG=(empty string)`| (initial, warning)| `<empty string>` |
| `LANG=(array with string)`| (changed, warning)| `"string"` |
| `LANG=(empty array)`| (initial, warning)| `<empty string>` |
| `LANG=(object)`| (changed, warning)| `"result of toString()"` |
| `LANG=(numeric string)`| (changed, warning)| `"42"` |
| `LANG=(-1)`| (changed, warning)| `"-1"` |
| `LANG=(0)`| (changed, warning)| `"0"` |
| `LANG=(integer)`| (changed, warning)| `"1"` |
| `LANG=(NaN)`| (changed, warning)| `"NaN"` |
| `LANG=(float)`| (changed, warning)| `"99.99"` |
| `LANG=(true)`| (initial, warning)| `<empty string>` |
| `LANG=(false)`| (initial, warning)| `<empty string>` |
| `LANG=(string 'true')`| (changed, warning)| `"true"` |
| `LANG=(string 'false')`| (changed, warning)| `"false"` |
| `LANG=(string 'on')`| (changed, warning)| `"on"` |
| `LANG=(string 'off')`| (changed, warning)| `"off"` |
| `LANG=(symbol)`| (initial, warning)| `<empty string>` |
| `LANG=(function)`| (initial, warning)| `<empty string>` |
| `LANG=(null)`| (initial, warning)| `<empty string>` |
| `LANG=(undefined)`| (initial, warning)| `<empty string>` |

## `lang` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `lang=(string)`| (changed)| `"a string"` |
| `lang=(empty string)`| (initial)| `<empty string>` |
| `lang=(array with string)`| (changed)| `"string"` |
| `lang=(empty array)`| (initial)| `<empty string>` |
| `lang=(object)`| (changed)| `"result of toString()"` |
| `lang=(numeric string)`| (changed)| `"42"` |
| `lang=(-1)`| (changed)| `"-1"` |
| `lang=(0)`| (changed)| `"0"` |
| `lang=(integer)`| (changed)| `"1"` |
| `lang=(NaN)`| (changed, warning)| `"NaN"` |
| `lang=(float)`| (changed)| `"99.99"` |
| `lang=(true)`| (initial, warning)| `<empty string>` |
| `lang=(false)`| (initial, warning)| `<empty string>` |
| `lang=(string 'true')`| (changed)| `"true"` |
| `lang=(string 'false')`| (changed)| `"false"` |
| `lang=(string 'on')`| (changed)| `"on"` |
| `lang=(string 'off')`| (changed)| `"off"` |
| `lang=(symbol)`| (initial, warning)| `<empty string>` |
| `lang=(function)`| (initial, warning)| `<empty string>` |
| `lang=(null)`| (initial)| `<empty string>` |
| `lang=(undefined)`| (initial)| `<empty string>` |

## `lang` (on `<html>` inside `<document>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `lang=(string)`| (changed, ssr mismatch)| `"a string"` |
| `lang=(empty string)`| (initial)| `<empty string>` |
| `lang=(array with string)`| (changed, ssr mismatch)| `"string"` |
| `lang=(empty array)`| (initial)| `<empty string>` |
| `lang=(object)`| (changed, ssr mismatch)| `"result of toString()"` |
| `lang=(numeric string)`| (changed, ssr mismatch)| `"42"` |
| `lang=(-1)`| (changed, ssr mismatch)| `"-1"` |
| `lang=(0)`| (changed, ssr mismatch)| `"0"` |
| `lang=(integer)`| (changed, ssr mismatch)| `"1"` |
| `lang=(NaN)`| (changed, warning, ssr mismatch)| `"NaN"` |
| `lang=(float)`| (changed, ssr mismatch)| `"99.99"` |
| `lang=(true)`| (initial, warning)| `<empty string>` |
| `lang=(false)`| (initial, warning)| `<empty string>` |
| `lang=(string 'true')`| (changed, ssr mismatch)| `"true"` |
| `lang=(string 'false')`| (changed, ssr mismatch)| `"false"` |
| `lang=(string 'on')`| (changed, ssr mismatch)| `"on"` |
| `lang=(string 'off')`| (changed, ssr mismatch)| `"off"` |
| `lang=(symbol)`| (initial, warning)| `<empty string>` |
| `lang=(function)`| (initial, warning)| `<empty string>` |
| `lang=(null)`| (initial)| `<empty string>` |
| `lang=(undefined)`| (initial)| `<empty string>` |

## `length` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `length=(string)`| (changed)| `"a string"` |
| `length=(empty string)`| (changed)| `<empty string>` |
| `length=(array with string)`| (changed)| `"string"` |
| `length=(empty array)`| (changed)| `<empty string>` |
| `length=(object)`| (changed)| `"result of toString()"` |
| `length=(numeric string)`| (changed)| `"42"` |
| `length=(-1)`| (changed)| `"-1"` |
| `length=(0)`| (changed)| `"0"` |
| `length=(integer)`| (changed)| `"1"` |
| `length=(NaN)`| (changed, warning)| `"NaN"` |
| `length=(float)`| (changed)| `"99.99"` |
| `length=(true)`| (initial, warning)| `<null>` |
| `length=(false)`| (initial, warning)| `<null>` |
| `length=(string 'true')`| (changed)| `"true"` |
| `length=(string 'false')`| (changed)| `"false"` |
| `length=(string 'on')`| (changed)| `"on"` |
| `length=(string 'off')`| (changed)| `"off"` |
| `length=(symbol)`| (initial, warning)| `<null>` |
| `length=(function)`| (initial, warning)| `<null>` |
| `length=(null)`| (initial)| `<null>` |
| `length=(undefined)`| (initial)| `<null>` |

## `lengthAdjust` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `lengthAdjust=(string)`| (changed)| `<number: 2>` |
| `lengthAdjust=(empty string)`| (initial)| `<number: 1>` |
| `lengthAdjust=(array with string)`| (changed)| `<number: 2>` |
| `lengthAdjust=(empty array)`| (initial)| `<number: 1>` |
| `lengthAdjust=(object)`| (initial)| `<number: 1>` |
| `lengthAdjust=(numeric string)`| (initial)| `<number: 1>` |
| `lengthAdjust=(-1)`| (initial)| `<number: 1>` |
| `lengthAdjust=(0)`| (initial)| `<number: 1>` |
| `lengthAdjust=(integer)`| (initial)| `<number: 1>` |
| `lengthAdjust=(NaN)`| (initial, warning)| `<number: 1>` |
| `lengthAdjust=(float)`| (initial)| `<number: 1>` |
| `lengthAdjust=(true)`| (initial, warning)| `<number: 1>` |
| `lengthAdjust=(false)`| (initial, warning)| `<number: 1>` |
| `lengthAdjust=(string 'true')`| (initial)| `<number: 1>` |
| `lengthAdjust=(string 'false')`| (initial)| `<number: 1>` |
| `lengthAdjust=(string 'on')`| (initial)| `<number: 1>` |
| `lengthAdjust=(string 'off')`| (initial)| `<number: 1>` |
| `lengthAdjust=(symbol)`| (initial, warning)| `<number: 1>` |
| `lengthAdjust=(function)`| (initial, warning)| `<number: 1>` |
| `lengthAdjust=(null)`| (initial)| `<number: 1>` |
| `lengthAdjust=(undefined)`| (initial)| `<number: 1>` |

## `letter-spacing` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `letter-spacing=(string)`| (changed, warning)| `"a string"` |
| `letter-spacing=(empty string)`| (changed, warning)| `<empty string>` |
| `letter-spacing=(array with string)`| (changed, warning)| `"string"` |
| `letter-spacing=(empty array)`| (changed, warning)| `<empty string>` |
| `letter-spacing=(object)`| (changed, warning)| `"result of toString()"` |
| `letter-spacing=(numeric string)`| (changed, warning)| `"42"` |
| `letter-spacing=(-1)`| (changed, warning)| `"-1"` |
| `letter-spacing=(0)`| (changed, warning)| `"0"` |
| `letter-spacing=(integer)`| (changed, warning)| `"1"` |
| `letter-spacing=(NaN)`| (changed, warning)| `"NaN"` |
| `letter-spacing=(float)`| (changed, warning)| `"99.99"` |
| `letter-spacing=(true)`| (initial, warning)| `<null>` |
| `letter-spacing=(false)`| (initial, warning)| `<null>` |
| `letter-spacing=(string 'true')`| (changed, warning)| `"true"` |
| `letter-spacing=(string 'false')`| (changed, warning)| `"false"` |
| `letter-spacing=(string 'on')`| (changed, warning)| `"on"` |
| `letter-spacing=(string 'off')`| (changed, warning)| `"off"` |
| `letter-spacing=(symbol)`| (initial, warning)| `<null>` |
| `letter-spacing=(function)`| (initial, warning)| `<null>` |
| `letter-spacing=(null)`| (initial, warning)| `<null>` |
| `letter-spacing=(undefined)`| (initial, warning)| `<null>` |

## `letterSpacing` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `letterSpacing=(string)`| (changed)| `"a string"` |
| `letterSpacing=(empty string)`| (changed)| `<empty string>` |
| `letterSpacing=(array with string)`| (changed)| `"string"` |
| `letterSpacing=(empty array)`| (changed)| `<empty string>` |
| `letterSpacing=(object)`| (changed)| `"result of toString()"` |
| `letterSpacing=(numeric string)`| (changed)| `"42"` |
| `letterSpacing=(-1)`| (changed)| `"-1"` |
| `letterSpacing=(0)`| (changed)| `"0"` |
| `letterSpacing=(integer)`| (changed)| `"1"` |
| `letterSpacing=(NaN)`| (changed, warning)| `"NaN"` |
| `letterSpacing=(float)`| (changed)| `"99.99"` |
| `letterSpacing=(true)`| (initial, warning)| `<null>` |
| `letterSpacing=(false)`| (initial, warning)| `<null>` |
| `letterSpacing=(string 'true')`| (changed)| `"true"` |
| `letterSpacing=(string 'false')`| (changed)| `"false"` |
| `letterSpacing=(string 'on')`| (changed)| `"on"` |
| `letterSpacing=(string 'off')`| (changed)| `"off"` |
| `letterSpacing=(symbol)`| (initial, warning)| `<null>` |
| `letterSpacing=(function)`| (initial, warning)| `<null>` |
| `letterSpacing=(null)`| (initial)| `<null>` |
| `letterSpacing=(undefined)`| (initial)| `<null>` |

## `lighting-color` (on `<feDiffuseLighting>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `lighting-color=(string)`| (changed, warning)| `"a string"` |
| `lighting-color=(empty string)`| (changed, warning)| `<empty string>` |
| `lighting-color=(array with string)`| (changed, warning)| `"string"` |
| `lighting-color=(empty array)`| (changed, warning)| `<empty string>` |
| `lighting-color=(object)`| (changed, warning)| `"result of toString()"` |
| `lighting-color=(numeric string)`| (changed, warning)| `"42"` |
| `lighting-color=(-1)`| (changed, warning)| `"-1"` |
| `lighting-color=(0)`| (changed, warning)| `"0"` |
| `lighting-color=(integer)`| (changed, warning)| `"1"` |
| `lighting-color=(NaN)`| (changed, warning)| `"NaN"` |
| `lighting-color=(float)`| (changed, warning)| `"99.99"` |
| `lighting-color=(true)`| (initial, warning)| `<null>` |
| `lighting-color=(false)`| (initial, warning)| `<null>` |
| `lighting-color=(string 'true')`| (changed, warning)| `"true"` |
| `lighting-color=(string 'false')`| (changed, warning)| `"false"` |
| `lighting-color=(string 'on')`| (changed, warning)| `"on"` |
| `lighting-color=(string 'off')`| (changed, warning)| `"off"` |
| `lighting-color=(symbol)`| (initial, warning)| `<null>` |
| `lighting-color=(function)`| (initial, warning)| `<null>` |
| `lighting-color=(null)`| (initial, warning)| `<null>` |
| `lighting-color=(undefined)`| (initial, warning)| `<null>` |

## `lightingColor` (on `<feDiffuseLighting>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `lightingColor=(string)`| (changed)| `"a string"` |
| `lightingColor=(empty string)`| (changed)| `<empty string>` |
| `lightingColor=(array with string)`| (changed)| `"string"` |
| `lightingColor=(empty array)`| (changed)| `<empty string>` |
| `lightingColor=(object)`| (changed)| `"result of toString()"` |
| `lightingColor=(numeric string)`| (changed)| `"42"` |
| `lightingColor=(-1)`| (changed)| `"-1"` |
| `lightingColor=(0)`| (changed)| `"0"` |
| `lightingColor=(integer)`| (changed)| `"1"` |
| `lightingColor=(NaN)`| (changed, warning)| `"NaN"` |
| `lightingColor=(float)`| (changed)| `"99.99"` |
| `lightingColor=(true)`| (initial, warning)| `<null>` |
| `lightingColor=(false)`| (initial, warning)| `<null>` |
| `lightingColor=(string 'true')`| (changed)| `"true"` |
| `lightingColor=(string 'false')`| (changed)| `"false"` |
| `lightingColor=(string 'on')`| (changed)| `"on"` |
| `lightingColor=(string 'off')`| (changed)| `"off"` |
| `lightingColor=(symbol)`| (initial, warning)| `<null>` |
| `lightingColor=(function)`| (initial, warning)| `<null>` |
| `lightingColor=(null)`| (initial)| `<null>` |
| `lightingColor=(undefined)`| (initial)| `<null>` |

## `limitingConeAngle` (on `<feSpotLight>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `limitingConeAngle=(string)`| (initial)| `<number: 0>` |
| `limitingConeAngle=(empty string)`| (initial)| `<number: 0>` |
| `limitingConeAngle=(array with string)`| (initial)| `<number: 0>` |
| `limitingConeAngle=(empty array)`| (initial)| `<number: 0>` |
| `limitingConeAngle=(object)`| (initial)| `<number: 0>` |
| `limitingConeAngle=(numeric string)`| (changed)| `<number: 42>` |
| `limitingConeAngle=(-1)`| (changed)| `<number: -1>` |
| `limitingConeAngle=(0)`| (initial)| `<number: 0>` |
| `limitingConeAngle=(integer)`| (changed)| `<number: 1>` |
| `limitingConeAngle=(NaN)`| (initial, warning)| `<number: 0>` |
| `limitingConeAngle=(float)`| (changed)| `<number: 99.98999786376953>` |
| `limitingConeAngle=(true)`| (initial, warning)| `<number: 0>` |
| `limitingConeAngle=(false)`| (initial, warning)| `<number: 0>` |
| `limitingConeAngle=(string 'true')`| (initial)| `<number: 0>` |
| `limitingConeAngle=(string 'false')`| (initial)| `<number: 0>` |
| `limitingConeAngle=(string 'on')`| (initial)| `<number: 0>` |
| `limitingConeAngle=(string 'off')`| (initial)| `<number: 0>` |
| `limitingConeAngle=(symbol)`| (initial, warning)| `<number: 0>` |
| `limitingConeAngle=(function)`| (initial, warning)| `<number: 0>` |
| `limitingConeAngle=(null)`| (initial)| `<number: 0>` |
| `limitingConeAngle=(undefined)`| (initial)| `<number: 0>` |

## `list` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `list=(string)`| (changed)| `"a string"` |
| `list=(empty string)`| (changed)| `<empty string>` |
| `list=(array with string)`| (changed)| `"string"` |
| `list=(empty array)`| (changed)| `<empty string>` |
| `list=(object)`| (changed)| `"result of toString()"` |
| `list=(numeric string)`| (changed)| `"42"` |
| `list=(-1)`| (changed)| `"-1"` |
| `list=(0)`| (changed)| `"0"` |
| `list=(integer)`| (changed)| `"1"` |
| `list=(NaN)`| (changed, warning)| `"NaN"` |
| `list=(float)`| (changed)| `"99.99"` |
| `list=(true)`| (initial, warning)| `<null>` |
| `list=(false)`| (initial, warning)| `<null>` |
| `list=(string 'true')`| (changed)| `"true"` |
| `list=(string 'false')`| (changed)| `"false"` |
| `list=(string 'on')`| (changed)| `"on"` |
| `list=(string 'off')`| (changed)| `"off"` |
| `list=(symbol)`| (initial, warning)| `<null>` |
| `list=(function)`| (initial, warning)| `<null>` |
| `list=(null)`| (initial)| `<null>` |
| `list=(undefined)`| (initial)| `<null>` |

## `local` (on `<color-profile>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `local=(string)`| (changed)| `"a string"` |
| `local=(empty string)`| (changed)| `<empty string>` |
| `local=(array with string)`| (changed)| `"string"` |
| `local=(empty array)`| (changed)| `<empty string>` |
| `local=(object)`| (changed)| `"result of toString()"` |
| `local=(numeric string)`| (changed)| `"42"` |
| `local=(-1)`| (changed)| `"-1"` |
| `local=(0)`| (changed)| `"0"` |
| `local=(integer)`| (changed)| `"1"` |
| `local=(NaN)`| (changed, warning)| `"NaN"` |
| `local=(float)`| (changed)| `"99.99"` |
| `local=(true)`| (initial, warning)| `<null>` |
| `local=(false)`| (initial, warning)| `<null>` |
| `local=(string 'true')`| (changed)| `"true"` |
| `local=(string 'false')`| (changed)| `"false"` |
| `local=(string 'on')`| (changed)| `"on"` |
| `local=(string 'off')`| (changed)| `"off"` |
| `local=(symbol)`| (initial, warning)| `<null>` |
| `local=(function)`| (initial, warning)| `<null>` |
| `local=(null)`| (initial)| `<null>` |
| `local=(undefined)`| (initial)| `<null>` |

## `loop` (on `<audio>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `loop=(string)`| (changed)| `<boolean: true>` |
| `loop=(empty string)`| (initial)| `<boolean: false>` |
| `loop=(array with string)`| (changed)| `<boolean: true>` |
| `loop=(empty array)`| (changed)| `<boolean: true>` |
| `loop=(object)`| (changed)| `<boolean: true>` |
| `loop=(numeric string)`| (changed)| `<boolean: true>` |
| `loop=(-1)`| (changed)| `<boolean: true>` |
| `loop=(0)`| (initial)| `<boolean: false>` |
| `loop=(integer)`| (changed)| `<boolean: true>` |
| `loop=(NaN)`| (initial, warning)| `<boolean: false>` |
| `loop=(float)`| (changed)| `<boolean: true>` |
| `loop=(true)`| (changed)| `<boolean: true>` |
| `loop=(false)`| (initial)| `<boolean: false>` |
| `loop=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `loop=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `loop=(string 'on')`| (changed)| `<boolean: true>` |
| `loop=(string 'off')`| (changed)| `<boolean: true>` |
| `loop=(symbol)`| (initial, warning)| `<boolean: false>` |
| `loop=(function)`| (initial, warning)| `<boolean: false>` |
| `loop=(null)`| (initial)| `<boolean: false>` |
| `loop=(undefined)`| (initial)| `<boolean: false>` |

## `low` (on `<meter>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `low=(string)`| (initial)| `<number: 0>` |
| `low=(empty string)`| (initial)| `<number: 0>` |
| `low=(array with string)`| (initial)| `<number: 0>` |
| `low=(empty array)`| (initial)| `<number: 0>` |
| `low=(object)`| (initial)| `<number: 0>` |
| `low=(numeric string)`| (changed)| `<number: 1>` |
| `low=(-1)`| (initial)| `<number: 0>` |
| `low=(0)`| (initial)| `<number: 0>` |
| `low=(integer)`| (changed)| `<number: 1>` |
| `low=(NaN)`| (initial, warning)| `<number: 0>` |
| `low=(float)`| (changed)| `<number: 1>` |
| `low=(true)`| (initial, warning)| `<number: 0>` |
| `low=(false)`| (initial, warning)| `<number: 0>` |
| `low=(string 'true')`| (initial)| `<number: 0>` |
| `low=(string 'false')`| (initial)| `<number: 0>` |
| `low=(string 'on')`| (initial)| `<number: 0>` |
| `low=(string 'off')`| (initial)| `<number: 0>` |
| `low=(symbol)`| (initial, warning)| `<number: 0>` |
| `low=(function)`| (initial, warning)| `<number: 0>` |
| `low=(null)`| (initial)| `<number: 0>` |
| `low=(undefined)`| (initial)| `<number: 0>` |

## `manifest` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `manifest=(string)`| (changed)| `"a string"` |
| `manifest=(empty string)`| (changed)| `<empty string>` |
| `manifest=(array with string)`| (changed)| `"string"` |
| `manifest=(empty array)`| (changed)| `<empty string>` |
| `manifest=(object)`| (changed)| `"result of toString()"` |
| `manifest=(numeric string)`| (changed)| `"42"` |
| `manifest=(-1)`| (changed)| `"-1"` |
| `manifest=(0)`| (changed)| `"0"` |
| `manifest=(integer)`| (changed)| `"1"` |
| `manifest=(NaN)`| (changed, warning)| `"NaN"` |
| `manifest=(float)`| (changed)| `"99.99"` |
| `manifest=(true)`| (initial, warning)| `<null>` |
| `manifest=(false)`| (initial, warning)| `<null>` |
| `manifest=(string 'true')`| (changed)| `"true"` |
| `manifest=(string 'false')`| (changed)| `"false"` |
| `manifest=(string 'on')`| (changed)| `"on"` |
| `manifest=(string 'off')`| (changed)| `"off"` |
| `manifest=(symbol)`| (initial, warning)| `<null>` |
| `manifest=(function)`| (initial, warning)| `<null>` |
| `manifest=(null)`| (initial)| `<null>` |
| `manifest=(undefined)`| (initial)| `<null>` |

## `marginHeight` (on `<frame>` inside `<frameset>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `marginHeight=(string)`| (changed, ssr error, ssr mismatch)| `"a string"` |
| `marginHeight=(empty string)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `marginHeight=(array with string)`| (changed, ssr error, ssr mismatch)| `"string"` |
| `marginHeight=(empty array)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `marginHeight=(object)`| (changed, ssr error, ssr mismatch)| `"result of toString()"` |
| `marginHeight=(numeric string)`| (changed, ssr error, ssr mismatch)| `"42"` |
| `marginHeight=(-1)`| (changed, ssr error, ssr mismatch)| `"-1"` |
| `marginHeight=(0)`| (changed, ssr error, ssr mismatch)| `"0"` |
| `marginHeight=(integer)`| (changed, ssr error, ssr mismatch)| `"1"` |
| `marginHeight=(NaN)`| (changed, warning, ssr error, ssr mismatch)| `"NaN"` |
| `marginHeight=(float)`| (changed, ssr error, ssr mismatch)| `"99.99"` |
| `marginHeight=(true)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `marginHeight=(false)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `marginHeight=(string 'true')`| (changed, ssr error, ssr mismatch)| `"true"` |
| `marginHeight=(string 'false')`| (changed, ssr error, ssr mismatch)| `"false"` |
| `marginHeight=(string 'on')`| (changed, ssr error, ssr mismatch)| `"on"` |
| `marginHeight=(string 'off')`| (changed, ssr error, ssr mismatch)| `"off"` |
| `marginHeight=(symbol)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `marginHeight=(function)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `marginHeight=(null)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `marginHeight=(undefined)`| (initial, ssr error, ssr mismatch)| `<empty string>` |

## `marginWidth` (on `<frame>` inside `<frameset>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `marginWidth=(string)`| (changed, ssr error, ssr mismatch)| `"a string"` |
| `marginWidth=(empty string)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `marginWidth=(array with string)`| (changed, ssr error, ssr mismatch)| `"string"` |
| `marginWidth=(empty array)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `marginWidth=(object)`| (changed, ssr error, ssr mismatch)| `"result of toString()"` |
| `marginWidth=(numeric string)`| (changed, ssr error, ssr mismatch)| `"42"` |
| `marginWidth=(-1)`| (changed, ssr error, ssr mismatch)| `"-1"` |
| `marginWidth=(0)`| (changed, ssr error, ssr mismatch)| `"0"` |
| `marginWidth=(integer)`| (changed, ssr error, ssr mismatch)| `"1"` |
| `marginWidth=(NaN)`| (changed, warning, ssr error, ssr mismatch)| `"NaN"` |
| `marginWidth=(float)`| (changed, ssr error, ssr mismatch)| `"99.99"` |
| `marginWidth=(true)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `marginWidth=(false)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `marginWidth=(string 'true')`| (changed, ssr error, ssr mismatch)| `"true"` |
| `marginWidth=(string 'false')`| (changed, ssr error, ssr mismatch)| `"false"` |
| `marginWidth=(string 'on')`| (changed, ssr error, ssr mismatch)| `"on"` |
| `marginWidth=(string 'off')`| (changed, ssr error, ssr mismatch)| `"off"` |
| `marginWidth=(symbol)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `marginWidth=(function)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `marginWidth=(null)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `marginWidth=(undefined)`| (initial, ssr error, ssr mismatch)| `<empty string>` |

## `marker-end` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `marker-end=(string)`| (changed, warning)| `"a string"` |
| `marker-end=(empty string)`| (changed, warning)| `<empty string>` |
| `marker-end=(array with string)`| (changed, warning)| `"string"` |
| `marker-end=(empty array)`| (changed, warning)| `<empty string>` |
| `marker-end=(object)`| (changed, warning)| `"result of toString()"` |
| `marker-end=(numeric string)`| (changed, warning)| `"42"` |
| `marker-end=(-1)`| (changed, warning)| `"-1"` |
| `marker-end=(0)`| (changed, warning)| `"0"` |
| `marker-end=(integer)`| (changed, warning)| `"1"` |
| `marker-end=(NaN)`| (changed, warning)| `"NaN"` |
| `marker-end=(float)`| (changed, warning)| `"99.99"` |
| `marker-end=(true)`| (initial, warning)| `<null>` |
| `marker-end=(false)`| (initial, warning)| `<null>` |
| `marker-end=(string 'true')`| (changed, warning)| `"true"` |
| `marker-end=(string 'false')`| (changed, warning)| `"false"` |
| `marker-end=(string 'on')`| (changed, warning)| `"on"` |
| `marker-end=(string 'off')`| (changed, warning)| `"off"` |
| `marker-end=(symbol)`| (initial, warning)| `<null>` |
| `marker-end=(function)`| (initial, warning)| `<null>` |
| `marker-end=(null)`| (initial, warning)| `<null>` |
| `marker-end=(undefined)`| (initial, warning)| `<null>` |

## `marker-mid` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `marker-mid=(string)`| (changed, warning)| `"a string"` |
| `marker-mid=(empty string)`| (changed, warning)| `<empty string>` |
| `marker-mid=(array with string)`| (changed, warning)| `"string"` |
| `marker-mid=(empty array)`| (changed, warning)| `<empty string>` |
| `marker-mid=(object)`| (changed, warning)| `"result of toString()"` |
| `marker-mid=(numeric string)`| (changed, warning)| `"42"` |
| `marker-mid=(-1)`| (changed, warning)| `"-1"` |
| `marker-mid=(0)`| (changed, warning)| `"0"` |
| `marker-mid=(integer)`| (changed, warning)| `"1"` |
| `marker-mid=(NaN)`| (changed, warning)| `"NaN"` |
| `marker-mid=(float)`| (changed, warning)| `"99.99"` |
| `marker-mid=(true)`| (initial, warning)| `<null>` |
| `marker-mid=(false)`| (initial, warning)| `<null>` |
| `marker-mid=(string 'true')`| (changed, warning)| `"true"` |
| `marker-mid=(string 'false')`| (changed, warning)| `"false"` |
| `marker-mid=(string 'on')`| (changed, warning)| `"on"` |
| `marker-mid=(string 'off')`| (changed, warning)| `"off"` |
| `marker-mid=(symbol)`| (initial, warning)| `<null>` |
| `marker-mid=(function)`| (initial, warning)| `<null>` |
| `marker-mid=(null)`| (initial, warning)| `<null>` |
| `marker-mid=(undefined)`| (initial, warning)| `<null>` |

## `marker-start` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `marker-start=(string)`| (changed, warning)| `"a string"` |
| `marker-start=(empty string)`| (changed, warning)| `<empty string>` |
| `marker-start=(array with string)`| (changed, warning)| `"string"` |
| `marker-start=(empty array)`| (changed, warning)| `<empty string>` |
| `marker-start=(object)`| (changed, warning)| `"result of toString()"` |
| `marker-start=(numeric string)`| (changed, warning)| `"42"` |
| `marker-start=(-1)`| (changed, warning)| `"-1"` |
| `marker-start=(0)`| (changed, warning)| `"0"` |
| `marker-start=(integer)`| (changed, warning)| `"1"` |
| `marker-start=(NaN)`| (changed, warning)| `"NaN"` |
| `marker-start=(float)`| (changed, warning)| `"99.99"` |
| `marker-start=(true)`| (initial, warning)| `<null>` |
| `marker-start=(false)`| (initial, warning)| `<null>` |
| `marker-start=(string 'true')`| (changed, warning)| `"true"` |
| `marker-start=(string 'false')`| (changed, warning)| `"false"` |
| `marker-start=(string 'on')`| (changed, warning)| `"on"` |
| `marker-start=(string 'off')`| (changed, warning)| `"off"` |
| `marker-start=(symbol)`| (initial, warning)| `<null>` |
| `marker-start=(function)`| (initial, warning)| `<null>` |
| `marker-start=(null)`| (initial, warning)| `<null>` |
| `marker-start=(undefined)`| (initial, warning)| `<null>` |

## `markerEnd` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `markerEnd=(string)`| (changed)| `"a string"` |
| `markerEnd=(empty string)`| (changed)| `<empty string>` |
| `markerEnd=(array with string)`| (changed)| `"string"` |
| `markerEnd=(empty array)`| (changed)| `<empty string>` |
| `markerEnd=(object)`| (changed)| `"result of toString()"` |
| `markerEnd=(numeric string)`| (changed)| `"42"` |
| `markerEnd=(-1)`| (changed)| `"-1"` |
| `markerEnd=(0)`| (changed)| `"0"` |
| `markerEnd=(integer)`| (changed)| `"1"` |
| `markerEnd=(NaN)`| (changed, warning)| `"NaN"` |
| `markerEnd=(float)`| (changed)| `"99.99"` |
| `markerEnd=(true)`| (initial, warning)| `<null>` |
| `markerEnd=(false)`| (initial, warning)| `<null>` |
| `markerEnd=(string 'true')`| (changed)| `"true"` |
| `markerEnd=(string 'false')`| (changed)| `"false"` |
| `markerEnd=(string 'on')`| (changed)| `"on"` |
| `markerEnd=(string 'off')`| (changed)| `"off"` |
| `markerEnd=(symbol)`| (initial, warning)| `<null>` |
| `markerEnd=(function)`| (initial, warning)| `<null>` |
| `markerEnd=(null)`| (initial)| `<null>` |
| `markerEnd=(undefined)`| (initial)| `<null>` |

## `markerHeight` (on `<marker>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `markerHeight=(string)`| (initial)| `<SVGLength: 3>` |
| `markerHeight=(empty string)`| (initial)| `<SVGLength: 3>` |
| `markerHeight=(array with string)`| (initial)| `<SVGLength: 3>` |
| `markerHeight=(empty array)`| (initial)| `<SVGLength: 3>` |
| `markerHeight=(object)`| (initial)| `<SVGLength: 3>` |
| `markerHeight=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `markerHeight=(-1)`| (changed)| `<SVGLength: -1>` |
| `markerHeight=(0)`| (changed)| `<SVGLength: 0>` |
| `markerHeight=(integer)`| (changed)| `<SVGLength: 1>` |
| `markerHeight=(NaN)`| (initial, warning)| `<SVGLength: 3>` |
| `markerHeight=(float)`| (changed)| `<SVGLength: 99.99>` |
| `markerHeight=(true)`| (initial, warning)| `<SVGLength: 3>` |
| `markerHeight=(false)`| (initial, warning)| `<SVGLength: 3>` |
| `markerHeight=(string 'true')`| (initial)| `<SVGLength: 3>` |
| `markerHeight=(string 'false')`| (initial)| `<SVGLength: 3>` |
| `markerHeight=(string 'on')`| (initial)| `<SVGLength: 3>` |
| `markerHeight=(string 'off')`| (initial)| `<SVGLength: 3>` |
| `markerHeight=(symbol)`| (initial, warning)| `<SVGLength: 3>` |
| `markerHeight=(function)`| (initial, warning)| `<SVGLength: 3>` |
| `markerHeight=(null)`| (initial)| `<SVGLength: 3>` |
| `markerHeight=(undefined)`| (initial)| `<SVGLength: 3>` |

## `markerMid` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `markerMid=(string)`| (changed)| `"a string"` |
| `markerMid=(empty string)`| (changed)| `<empty string>` |
| `markerMid=(array with string)`| (changed)| `"string"` |
| `markerMid=(empty array)`| (changed)| `<empty string>` |
| `markerMid=(object)`| (changed)| `"result of toString()"` |
| `markerMid=(numeric string)`| (changed)| `"42"` |
| `markerMid=(-1)`| (changed)| `"-1"` |
| `markerMid=(0)`| (changed)| `"0"` |
| `markerMid=(integer)`| (changed)| `"1"` |
| `markerMid=(NaN)`| (changed, warning)| `"NaN"` |
| `markerMid=(float)`| (changed)| `"99.99"` |
| `markerMid=(true)`| (initial, warning)| `<null>` |
| `markerMid=(false)`| (initial, warning)| `<null>` |
| `markerMid=(string 'true')`| (changed)| `"true"` |
| `markerMid=(string 'false')`| (changed)| `"false"` |
| `markerMid=(string 'on')`| (changed)| `"on"` |
| `markerMid=(string 'off')`| (changed)| `"off"` |
| `markerMid=(symbol)`| (initial, warning)| `<null>` |
| `markerMid=(function)`| (initial, warning)| `<null>` |
| `markerMid=(null)`| (initial)| `<null>` |
| `markerMid=(undefined)`| (initial)| `<null>` |

## `markerStart` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `markerStart=(string)`| (changed)| `"a string"` |
| `markerStart=(empty string)`| (changed)| `<empty string>` |
| `markerStart=(array with string)`| (changed)| `"string"` |
| `markerStart=(empty array)`| (changed)| `<empty string>` |
| `markerStart=(object)`| (changed)| `"result of toString()"` |
| `markerStart=(numeric string)`| (changed)| `"42"` |
| `markerStart=(-1)`| (changed)| `"-1"` |
| `markerStart=(0)`| (changed)| `"0"` |
| `markerStart=(integer)`| (changed)| `"1"` |
| `markerStart=(NaN)`| (changed, warning)| `"NaN"` |
| `markerStart=(float)`| (changed)| `"99.99"` |
| `markerStart=(true)`| (initial, warning)| `<null>` |
| `markerStart=(false)`| (initial, warning)| `<null>` |
| `markerStart=(string 'true')`| (changed)| `"true"` |
| `markerStart=(string 'false')`| (changed)| `"false"` |
| `markerStart=(string 'on')`| (changed)| `"on"` |
| `markerStart=(string 'off')`| (changed)| `"off"` |
| `markerStart=(symbol)`| (initial, warning)| `<null>` |
| `markerStart=(function)`| (initial, warning)| `<null>` |
| `markerStart=(null)`| (initial)| `<null>` |
| `markerStart=(undefined)`| (initial)| `<null>` |

## `markerUnits` (on `<marker>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `markerUnits=(string)`| (initial)| `<number: 2>` |
| `markerUnits=(empty string)`| (initial)| `<number: 2>` |
| `markerUnits=(array with string)`| (initial)| `<number: 2>` |
| `markerUnits=(empty array)`| (initial)| `<number: 2>` |
| `markerUnits=(object)`| (initial)| `<number: 2>` |
| `markerUnits=(numeric string)`| (initial)| `<number: 2>` |
| `markerUnits=(-1)`| (initial)| `<number: 2>` |
| `markerUnits=(0)`| (initial)| `<number: 2>` |
| `markerUnits=(integer)`| (initial)| `<number: 2>` |
| `markerUnits=(NaN)`| (initial, warning)| `<number: 2>` |
| `markerUnits=(float)`| (initial)| `<number: 2>` |
| `markerUnits=(true)`| (initial, warning)| `<number: 2>` |
| `markerUnits=(false)`| (initial, warning)| `<number: 2>` |
| `markerUnits=(string 'true')`| (initial)| `<number: 2>` |
| `markerUnits=(string 'false')`| (initial)| `<number: 2>` |
| `markerUnits=(string 'on')`| (initial)| `<number: 2>` |
| `markerUnits=(string 'off')`| (initial)| `<number: 2>` |
| `markerUnits=(symbol)`| (initial, warning)| `<number: 2>` |
| `markerUnits=(function)`| (initial, warning)| `<number: 2>` |
| `markerUnits=(null)`| (initial)| `<number: 2>` |
| `markerUnits=(undefined)`| (initial)| `<number: 2>` |

## `markerWidth` (on `<marker>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `markerWidth=(string)`| (initial)| `<SVGLength: 3>` |
| `markerWidth=(empty string)`| (initial)| `<SVGLength: 3>` |
| `markerWidth=(array with string)`| (initial)| `<SVGLength: 3>` |
| `markerWidth=(empty array)`| (initial)| `<SVGLength: 3>` |
| `markerWidth=(object)`| (initial)| `<SVGLength: 3>` |
| `markerWidth=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `markerWidth=(-1)`| (changed)| `<SVGLength: -1>` |
| `markerWidth=(0)`| (changed)| `<SVGLength: 0>` |
| `markerWidth=(integer)`| (changed)| `<SVGLength: 1>` |
| `markerWidth=(NaN)`| (initial, warning)| `<SVGLength: 3>` |
| `markerWidth=(float)`| (changed)| `<SVGLength: 99.99>` |
| `markerWidth=(true)`| (initial, warning)| `<SVGLength: 3>` |
| `markerWidth=(false)`| (initial, warning)| `<SVGLength: 3>` |
| `markerWidth=(string 'true')`| (initial)| `<SVGLength: 3>` |
| `markerWidth=(string 'false')`| (initial)| `<SVGLength: 3>` |
| `markerWidth=(string 'on')`| (initial)| `<SVGLength: 3>` |
| `markerWidth=(string 'off')`| (initial)| `<SVGLength: 3>` |
| `markerWidth=(symbol)`| (initial, warning)| `<SVGLength: 3>` |
| `markerWidth=(function)`| (initial, warning)| `<SVGLength: 3>` |
| `markerWidth=(null)`| (initial)| `<SVGLength: 3>` |
| `markerWidth=(undefined)`| (initial)| `<SVGLength: 3>` |

## `mask` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `mask=(string)`| (changed)| `"a string"` |
| `mask=(empty string)`| (changed)| `<empty string>` |
| `mask=(array with string)`| (changed)| `"string"` |
| `mask=(empty array)`| (changed)| `<empty string>` |
| `mask=(object)`| (changed)| `"result of toString()"` |
| `mask=(numeric string)`| (changed)| `"42"` |
| `mask=(-1)`| (changed)| `"-1"` |
| `mask=(0)`| (changed)| `"0"` |
| `mask=(integer)`| (changed)| `"1"` |
| `mask=(NaN)`| (changed, warning)| `"NaN"` |
| `mask=(float)`| (changed)| `"99.99"` |
| `mask=(true)`| (initial, warning)| `<null>` |
| `mask=(false)`| (initial, warning)| `<null>` |
| `mask=(string 'true')`| (changed)| `"true"` |
| `mask=(string 'false')`| (changed)| `"false"` |
| `mask=(string 'on')`| (changed)| `"on"` |
| `mask=(string 'off')`| (changed)| `"off"` |
| `mask=(symbol)`| (initial, warning)| `<null>` |
| `mask=(function)`| (initial, warning)| `<null>` |
| `mask=(null)`| (initial)| `<null>` |
| `mask=(undefined)`| (initial)| `<null>` |

## `maskContentUnits` (on `<mask>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `maskContentUnits=(string)`| (changed)| `<number: 2>` |
| `maskContentUnits=(empty string)`| (initial)| `<number: 1>` |
| `maskContentUnits=(array with string)`| (changed)| `<number: 2>` |
| `maskContentUnits=(empty array)`| (initial)| `<number: 1>` |
| `maskContentUnits=(object)`| (initial)| `<number: 1>` |
| `maskContentUnits=(numeric string)`| (initial)| `<number: 1>` |
| `maskContentUnits=(-1)`| (initial)| `<number: 1>` |
| `maskContentUnits=(0)`| (initial)| `<number: 1>` |
| `maskContentUnits=(integer)`| (initial)| `<number: 1>` |
| `maskContentUnits=(NaN)`| (initial, warning)| `<number: 1>` |
| `maskContentUnits=(float)`| (initial)| `<number: 1>` |
| `maskContentUnits=(true)`| (initial, warning)| `<number: 1>` |
| `maskContentUnits=(false)`| (initial, warning)| `<number: 1>` |
| `maskContentUnits=(string 'true')`| (initial)| `<number: 1>` |
| `maskContentUnits=(string 'false')`| (initial)| `<number: 1>` |
| `maskContentUnits=(string 'on')`| (initial)| `<number: 1>` |
| `maskContentUnits=(string 'off')`| (initial)| `<number: 1>` |
| `maskContentUnits=(symbol)`| (initial, warning)| `<number: 1>` |
| `maskContentUnits=(function)`| (initial, warning)| `<number: 1>` |
| `maskContentUnits=(null)`| (initial)| `<number: 1>` |
| `maskContentUnits=(undefined)`| (initial)| `<number: 1>` |

## `maskUnits` (on `<mask>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `maskUnits=(string)`| (changed)| `<number: 1>` |
| `maskUnits=(empty string)`| (initial)| `<number: 2>` |
| `maskUnits=(array with string)`| (changed)| `<number: 1>` |
| `maskUnits=(empty array)`| (initial)| `<number: 2>` |
| `maskUnits=(object)`| (initial)| `<number: 2>` |
| `maskUnits=(numeric string)`| (initial)| `<number: 2>` |
| `maskUnits=(-1)`| (initial)| `<number: 2>` |
| `maskUnits=(0)`| (initial)| `<number: 2>` |
| `maskUnits=(integer)`| (initial)| `<number: 2>` |
| `maskUnits=(NaN)`| (initial, warning)| `<number: 2>` |
| `maskUnits=(float)`| (initial)| `<number: 2>` |
| `maskUnits=(true)`| (initial, warning)| `<number: 2>` |
| `maskUnits=(false)`| (initial, warning)| `<number: 2>` |
| `maskUnits=(string 'true')`| (initial)| `<number: 2>` |
| `maskUnits=(string 'false')`| (initial)| `<number: 2>` |
| `maskUnits=(string 'on')`| (initial)| `<number: 2>` |
| `maskUnits=(string 'off')`| (initial)| `<number: 2>` |
| `maskUnits=(symbol)`| (initial, warning)| `<number: 2>` |
| `maskUnits=(function)`| (initial, warning)| `<number: 2>` |
| `maskUnits=(null)`| (initial)| `<number: 2>` |
| `maskUnits=(undefined)`| (initial)| `<number: 2>` |

## `mathematical` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `mathematical=(string)`| (changed)| `"a string"` |
| `mathematical=(empty string)`| (changed)| `<empty string>` |
| `mathematical=(array with string)`| (changed)| `"string"` |
| `mathematical=(empty array)`| (changed)| `<empty string>` |
| `mathematical=(object)`| (changed)| `"result of toString()"` |
| `mathematical=(numeric string)`| (changed)| `"42"` |
| `mathematical=(-1)`| (changed)| `"-1"` |
| `mathematical=(0)`| (changed)| `"0"` |
| `mathematical=(integer)`| (changed)| `"1"` |
| `mathematical=(NaN)`| (changed, warning)| `"NaN"` |
| `mathematical=(float)`| (changed)| `"99.99"` |
| `mathematical=(true)`| (initial, warning)| `<null>` |
| `mathematical=(false)`| (initial, warning)| `<null>` |
| `mathematical=(string 'true')`| (changed)| `"true"` |
| `mathematical=(string 'false')`| (changed)| `"false"` |
| `mathematical=(string 'on')`| (changed)| `"on"` |
| `mathematical=(string 'off')`| (changed)| `"off"` |
| `mathematical=(symbol)`| (initial, warning)| `<null>` |
| `mathematical=(function)`| (initial, warning)| `<null>` |
| `mathematical=(null)`| (initial)| `<null>` |
| `mathematical=(undefined)`| (initial)| `<null>` |

## `max` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `max=(string)`| (changed)| `"a string"` |
| `max=(empty string)`| (initial)| `<empty string>` |
| `max=(array with string)`| (changed)| `"string"` |
| `max=(empty array)`| (initial)| `<empty string>` |
| `max=(object)`| (changed)| `"result of toString()"` |
| `max=(numeric string)`| (changed)| `"42"` |
| `max=(-1)`| (changed)| `"-1"` |
| `max=(0)`| (changed)| `"0"` |
| `max=(integer)`| (changed)| `"1"` |
| `max=(NaN)`| (changed, warning)| `"NaN"` |
| `max=(float)`| (changed)| `"99.99"` |
| `max=(true)`| (initial, warning)| `<empty string>` |
| `max=(false)`| (initial, warning)| `<empty string>` |
| `max=(string 'true')`| (changed)| `"true"` |
| `max=(string 'false')`| (changed)| `"false"` |
| `max=(string 'on')`| (changed)| `"on"` |
| `max=(string 'off')`| (changed)| `"off"` |
| `max=(symbol)`| (initial, warning)| `<empty string>` |
| `max=(function)`| (initial, warning)| `<empty string>` |
| `max=(null)`| (initial)| `<empty string>` |
| `max=(undefined)`| (initial)| `<empty string>` |

## `max` (on `<meter>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `max=(string)`| (initial)| `<number: 1>` |
| `max=(empty string)`| (initial)| `<number: 1>` |
| `max=(array with string)`| (initial)| `<number: 1>` |
| `max=(empty array)`| (initial)| `<number: 1>` |
| `max=(object)`| (initial)| `<number: 1>` |
| `max=(numeric string)`| (changed)| `<number: 42>` |
| `max=(-1)`| (changed)| `<number: 0>` |
| `max=(0)`| (changed)| `<number: 0>` |
| `max=(integer)`| (initial)| `<number: 1>` |
| `max=(NaN)`| (initial, warning)| `<number: 1>` |
| `max=(float)`| (changed)| `<number: 99.99>` |
| `max=(true)`| (initial, warning)| `<number: 1>` |
| `max=(false)`| (initial, warning)| `<number: 1>` |
| `max=(string 'true')`| (initial)| `<number: 1>` |
| `max=(string 'false')`| (initial)| `<number: 1>` |
| `max=(string 'on')`| (initial)| `<number: 1>` |
| `max=(string 'off')`| (initial)| `<number: 1>` |
| `max=(symbol)`| (initial, warning)| `<number: 1>` |
| `max=(function)`| (initial, warning)| `<number: 1>` |
| `max=(null)`| (initial)| `<number: 1>` |
| `max=(undefined)`| (initial)| `<number: 1>` |

## `max` (on `<progress>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `max=(string)`| (initial)| `<number: 1>` |
| `max=(empty string)`| (initial)| `<number: 1>` |
| `max=(array with string)`| (initial)| `<number: 1>` |
| `max=(empty array)`| (initial)| `<number: 1>` |
| `max=(object)`| (initial)| `<number: 1>` |
| `max=(numeric string)`| (changed)| `<number: 42>` |
| `max=(-1)`| (initial)| `<number: 1>` |
| `max=(0)`| (initial)| `<number: 1>` |
| `max=(integer)`| (initial)| `<number: 1>` |
| `max=(NaN)`| (initial, warning)| `<number: 1>` |
| `max=(float)`| (changed)| `<number: 99.99>` |
| `max=(true)`| (initial, warning)| `<number: 1>` |
| `max=(false)`| (initial, warning)| `<number: 1>` |
| `max=(string 'true')`| (initial)| `<number: 1>` |
| `max=(string 'false')`| (initial)| `<number: 1>` |
| `max=(string 'on')`| (initial)| `<number: 1>` |
| `max=(string 'off')`| (initial)| `<number: 1>` |
| `max=(symbol)`| (initial, warning)| `<number: 1>` |
| `max=(function)`| (initial, warning)| `<number: 1>` |
| `max=(null)`| (initial)| `<number: 1>` |
| `max=(undefined)`| (initial)| `<number: 1>` |

## `max` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `max=(string)`| (changed)| `"a string"` |
| `max=(empty string)`| (changed)| `<empty string>` |
| `max=(array with string)`| (changed)| `"string"` |
| `max=(empty array)`| (changed)| `<empty string>` |
| `max=(object)`| (changed)| `"result of toString()"` |
| `max=(numeric string)`| (changed)| `"42"` |
| `max=(-1)`| (changed)| `"-1"` |
| `max=(0)`| (changed)| `"0"` |
| `max=(integer)`| (changed)| `"1"` |
| `max=(NaN)`| (changed, warning)| `"NaN"` |
| `max=(float)`| (changed)| `"99.99"` |
| `max=(true)`| (initial, warning)| `<null>` |
| `max=(false)`| (initial, warning)| `<null>` |
| `max=(string 'true')`| (changed)| `"true"` |
| `max=(string 'false')`| (changed)| `"false"` |
| `max=(string 'on')`| (changed)| `"on"` |
| `max=(string 'off')`| (changed)| `"off"` |
| `max=(symbol)`| (initial, warning)| `<null>` |
| `max=(function)`| (initial, warning)| `<null>` |
| `max=(null)`| (initial)| `<null>` |
| `max=(undefined)`| (initial)| `<null>` |

## `maxLength` (on `<textarea>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `maxLength=(string)`| (initial)| `<number: -1>` |
| `maxLength=(empty string)`| (initial)| `<number: -1>` |
| `maxLength=(array with string)`| (initial)| `<number: -1>` |
| `maxLength=(empty array)`| (initial)| `<number: -1>` |
| `maxLength=(object)`| (initial)| `<number: -1>` |
| `maxLength=(numeric string)`| (changed)| `<number: 42>` |
| `maxLength=(-1)`| (initial)| `<number: -1>` |
| `maxLength=(0)`| (changed)| `<number: 0>` |
| `maxLength=(integer)`| (changed)| `<number: 1>` |
| `maxLength=(NaN)`| (initial, warning)| `<number: -1>` |
| `maxLength=(float)`| (changed)| `<number: 99>` |
| `maxLength=(true)`| (initial, warning)| `<number: -1>` |
| `maxLength=(false)`| (initial, warning)| `<number: -1>` |
| `maxLength=(string 'true')`| (initial)| `<number: -1>` |
| `maxLength=(string 'false')`| (initial)| `<number: -1>` |
| `maxLength=(string 'on')`| (initial)| `<number: -1>` |
| `maxLength=(string 'off')`| (initial)| `<number: -1>` |
| `maxLength=(symbol)`| (initial, warning)| `<number: -1>` |
| `maxLength=(function)`| (initial, warning)| `<number: -1>` |
| `maxLength=(null)`| (initial)| `<number: -1>` |
| `maxLength=(undefined)`| (initial)| `<number: -1>` |

## `media` (on `<link>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `media=(string)`| (changed)| `"a string"` |
| `media=(empty string)`| (initial)| `<empty string>` |
| `media=(array with string)`| (changed)| `"string"` |
| `media=(empty array)`| (initial)| `<empty string>` |
| `media=(object)`| (changed)| `"result of toString()"` |
| `media=(numeric string)`| (changed)| `"42"` |
| `media=(-1)`| (changed)| `"-1"` |
| `media=(0)`| (changed)| `"0"` |
| `media=(integer)`| (changed)| `"1"` |
| `media=(NaN)`| (changed, warning)| `"NaN"` |
| `media=(float)`| (changed)| `"99.99"` |
| `media=(true)`| (initial, warning)| `<empty string>` |
| `media=(false)`| (initial, warning)| `<empty string>` |
| `media=(string 'true')`| (changed)| `"true"` |
| `media=(string 'false')`| (changed)| `"false"` |
| `media=(string 'on')`| (changed)| `"on"` |
| `media=(string 'off')`| (changed)| `"off"` |
| `media=(symbol)`| (initial, warning)| `<empty string>` |
| `media=(function)`| (initial, warning)| `<empty string>` |
| `media=(null)`| (initial)| `<empty string>` |
| `media=(undefined)`| (initial)| `<empty string>` |

## `media` (on `<style>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `media=(string)`| (changed)| `"a string"` |
| `media=(empty string)`| (changed)| `<empty string>` |
| `media=(array with string)`| (changed)| `"string"` |
| `media=(empty array)`| (changed)| `<empty string>` |
| `media=(object)`| (changed)| `"result of toString()"` |
| `media=(numeric string)`| (changed)| `"42"` |
| `media=(-1)`| (changed)| `"-1"` |
| `media=(0)`| (changed)| `"0"` |
| `media=(integer)`| (changed)| `"1"` |
| `media=(NaN)`| (changed, warning)| `"NaN"` |
| `media=(float)`| (changed)| `"99.99"` |
| `media=(true)`| (initial, warning)| `"all"` |
| `media=(false)`| (initial, warning)| `"all"` |
| `media=(string 'true')`| (changed)| `"true"` |
| `media=(string 'false')`| (changed)| `"false"` |
| `media=(string 'on')`| (changed)| `"on"` |
| `media=(string 'off')`| (changed)| `"off"` |
| `media=(symbol)`| (initial, warning)| `"all"` |
| `media=(function)`| (initial, warning)| `"all"` |
| `media=(null)`| (initial)| `"all"` |
| `media=(undefined)`| (initial)| `"all"` |

## `mediaGroup` (on `<video>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `mediaGroup=(string)`| (changed)| `"a string"` |
| `mediaGroup=(empty string)`| (changed)| `<empty string>` |
| `mediaGroup=(array with string)`| (changed)| `"string"` |
| `mediaGroup=(empty array)`| (changed)| `<empty string>` |
| `mediaGroup=(object)`| (changed)| `"result of toString()"` |
| `mediaGroup=(numeric string)`| (changed)| `"42"` |
| `mediaGroup=(-1)`| (changed)| `"-1"` |
| `mediaGroup=(0)`| (changed)| `"0"` |
| `mediaGroup=(integer)`| (changed)| `"1"` |
| `mediaGroup=(NaN)`| (changed, warning)| `"NaN"` |
| `mediaGroup=(float)`| (changed)| `"99.99"` |
| `mediaGroup=(true)`| (initial, warning)| `<null>` |
| `mediaGroup=(false)`| (initial, warning)| `<null>` |
| `mediaGroup=(string 'true')`| (changed)| `"true"` |
| `mediaGroup=(string 'false')`| (changed)| `"false"` |
| `mediaGroup=(string 'on')`| (changed)| `"on"` |
| `mediaGroup=(string 'off')`| (changed)| `"off"` |
| `mediaGroup=(symbol)`| (initial, warning)| `<null>` |
| `mediaGroup=(function)`| (initial, warning)| `<null>` |
| `mediaGroup=(null)`| (initial)| `<null>` |
| `mediaGroup=(undefined)`| (initial)| `<null>` |

## `method` (on `<form>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `method=(string)`| (changed)| `"post"` |
| `method=(empty string)`| (initial)| `"get"` |
| `method=(array with string)`| (changed)| `"post"` |
| `method=(empty array)`| (initial)| `"get"` |
| `method=(object)`| (initial)| `"get"` |
| `method=(numeric string)`| (initial)| `"get"` |
| `method=(-1)`| (initial)| `"get"` |
| `method=(0)`| (initial)| `"get"` |
| `method=(integer)`| (initial)| `"get"` |
| `method=(NaN)`| (initial, warning)| `"get"` |
| `method=(float)`| (initial)| `"get"` |
| `method=(true)`| (initial, warning)| `"get"` |
| `method=(false)`| (initial, warning)| `"get"` |
| `method=(string 'true')`| (initial)| `"get"` |
| `method=(string 'false')`| (initial)| `"get"` |
| `method=(string 'on')`| (initial)| `"get"` |
| `method=(string 'off')`| (initial)| `"get"` |
| `method=(symbol)`| (initial, warning)| `"get"` |
| `method=(function)`| (initial, warning)| `"get"` |
| `method=(null)`| (initial)| `"get"` |
| `method=(undefined)`| (initial)| `"get"` |

## `method` (on `<textPath>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `method=(string)`| (changed)| `<number: 2>` |
| `method=(empty string)`| (initial)| `<number: 1>` |
| `method=(array with string)`| (changed)| `<number: 2>` |
| `method=(empty array)`| (initial)| `<number: 1>` |
| `method=(object)`| (initial)| `<number: 1>` |
| `method=(numeric string)`| (initial)| `<number: 1>` |
| `method=(-1)`| (initial)| `<number: 1>` |
| `method=(0)`| (initial)| `<number: 1>` |
| `method=(integer)`| (initial)| `<number: 1>` |
| `method=(NaN)`| (initial, warning)| `<number: 1>` |
| `method=(float)`| (initial)| `<number: 1>` |
| `method=(true)`| (initial, warning)| `<number: 1>` |
| `method=(false)`| (initial, warning)| `<number: 1>` |
| `method=(string 'true')`| (initial)| `<number: 1>` |
| `method=(string 'false')`| (initial)| `<number: 1>` |
| `method=(string 'on')`| (initial)| `<number: 1>` |
| `method=(string 'off')`| (initial)| `<number: 1>` |
| `method=(symbol)`| (initial, warning)| `<number: 1>` |
| `method=(function)`| (initial, warning)| `<number: 1>` |
| `method=(null)`| (initial)| `<number: 1>` |
| `method=(undefined)`| (initial)| `<number: 1>` |

## `min` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `min=(string)`| (changed)| `"a string"` |
| `min=(empty string)`| (initial)| `<empty string>` |
| `min=(array with string)`| (changed)| `"string"` |
| `min=(empty array)`| (initial)| `<empty string>` |
| `min=(object)`| (changed)| `"result of toString()"` |
| `min=(numeric string)`| (changed)| `"42"` |
| `min=(-1)`| (changed)| `"-1"` |
| `min=(0)`| (changed)| `"0"` |
| `min=(integer)`| (changed)| `"1"` |
| `min=(NaN)`| (changed, warning)| `"NaN"` |
| `min=(float)`| (changed)| `"99.99"` |
| `min=(true)`| (initial, warning)| `<empty string>` |
| `min=(false)`| (initial, warning)| `<empty string>` |
| `min=(string 'true')`| (changed)| `"true"` |
| `min=(string 'false')`| (changed)| `"false"` |
| `min=(string 'on')`| (changed)| `"on"` |
| `min=(string 'off')`| (changed)| `"off"` |
| `min=(symbol)`| (initial, warning)| `<empty string>` |
| `min=(function)`| (initial, warning)| `<empty string>` |
| `min=(null)`| (initial)| `<empty string>` |
| `min=(undefined)`| (initial)| `<empty string>` |

## `min` (on `<meter>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `min=(string)`| (initial)| `<number: 0>` |
| `min=(empty string)`| (initial)| `<number: 0>` |
| `min=(array with string)`| (initial)| `<number: 0>` |
| `min=(empty array)`| (initial)| `<number: 0>` |
| `min=(object)`| (initial)| `<number: 0>` |
| `min=(numeric string)`| (changed)| `<number: 42>` |
| `min=(-1)`| (changed)| `<number: -1>` |
| `min=(0)`| (initial)| `<number: 0>` |
| `min=(integer)`| (changed)| `<number: 1>` |
| `min=(NaN)`| (initial, warning)| `<number: 0>` |
| `min=(float)`| (changed)| `<number: 99.99>` |
| `min=(true)`| (initial, warning)| `<number: 0>` |
| `min=(false)`| (initial, warning)| `<number: 0>` |
| `min=(string 'true')`| (initial)| `<number: 0>` |
| `min=(string 'false')`| (initial)| `<number: 0>` |
| `min=(string 'on')`| (initial)| `<number: 0>` |
| `min=(string 'off')`| (initial)| `<number: 0>` |
| `min=(symbol)`| (initial, warning)| `<number: 0>` |
| `min=(function)`| (initial, warning)| `<number: 0>` |
| `min=(null)`| (initial)| `<number: 0>` |
| `min=(undefined)`| (initial)| `<number: 0>` |

## `min` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `min=(string)`| (changed)| `"a string"` |
| `min=(empty string)`| (changed)| `<empty string>` |
| `min=(array with string)`| (changed)| `"string"` |
| `min=(empty array)`| (changed)| `<empty string>` |
| `min=(object)`| (changed)| `"result of toString()"` |
| `min=(numeric string)`| (changed)| `"42"` |
| `min=(-1)`| (changed)| `"-1"` |
| `min=(0)`| (changed)| `"0"` |
| `min=(integer)`| (changed)| `"1"` |
| `min=(NaN)`| (changed, warning)| `"NaN"` |
| `min=(float)`| (changed)| `"99.99"` |
| `min=(true)`| (initial, warning)| `<null>` |
| `min=(false)`| (initial, warning)| `<null>` |
| `min=(string 'true')`| (changed)| `"true"` |
| `min=(string 'false')`| (changed)| `"false"` |
| `min=(string 'on')`| (changed)| `"on"` |
| `min=(string 'off')`| (changed)| `"off"` |
| `min=(symbol)`| (initial, warning)| `<null>` |
| `min=(function)`| (initial, warning)| `<null>` |
| `min=(null)`| (initial)| `<null>` |
| `min=(undefined)`| (initial)| `<null>` |

## `minLength` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `minLength=(string)`| (initial)| `<number: -1>` |
| `minLength=(empty string)`| (initial)| `<number: -1>` |
| `minLength=(array with string)`| (initial)| `<number: -1>` |
| `minLength=(empty array)`| (initial)| `<number: -1>` |
| `minLength=(object)`| (initial)| `<number: -1>` |
| `minLength=(numeric string)`| (changed)| `<number: 42>` |
| `minLength=(-1)`| (initial)| `<number: -1>` |
| `minLength=(0)`| (changed)| `<number: 0>` |
| `minLength=(integer)`| (changed)| `<number: 1>` |
| `minLength=(NaN)`| (initial, warning)| `<number: -1>` |
| `minLength=(float)`| (changed)| `<number: 99>` |
| `minLength=(true)`| (initial, warning)| `<number: -1>` |
| `minLength=(false)`| (initial, warning)| `<number: -1>` |
| `minLength=(string 'true')`| (initial)| `<number: -1>` |
| `minLength=(string 'false')`| (initial)| `<number: -1>` |
| `minLength=(string 'on')`| (initial)| `<number: -1>` |
| `minLength=(string 'off')`| (initial)| `<number: -1>` |
| `minLength=(symbol)`| (initial, warning)| `<number: -1>` |
| `minLength=(function)`| (initial, warning)| `<number: -1>` |
| `minLength=(null)`| (initial)| `<number: -1>` |
| `minLength=(undefined)`| (initial)| `<number: -1>` |

## `mode` (on `<feBlend>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `mode=(string)`| (changed)| `<number: 2>` |
| `mode=(empty string)`| (initial)| `<number: 1>` |
| `mode=(array with string)`| (changed)| `<number: 2>` |
| `mode=(empty array)`| (initial)| `<number: 1>` |
| `mode=(object)`| (initial)| `<number: 1>` |
| `mode=(numeric string)`| (initial)| `<number: 1>` |
| `mode=(-1)`| (initial)| `<number: 1>` |
| `mode=(0)`| (initial)| `<number: 1>` |
| `mode=(integer)`| (initial)| `<number: 1>` |
| `mode=(NaN)`| (initial, warning)| `<number: 1>` |
| `mode=(float)`| (initial)| `<number: 1>` |
| `mode=(true)`| (initial, warning)| `<number: 1>` |
| `mode=(false)`| (initial, warning)| `<number: 1>` |
| `mode=(string 'true')`| (initial)| `<number: 1>` |
| `mode=(string 'false')`| (initial)| `<number: 1>` |
| `mode=(string 'on')`| (initial)| `<number: 1>` |
| `mode=(string 'off')`| (initial)| `<number: 1>` |
| `mode=(symbol)`| (initial, warning)| `<number: 1>` |
| `mode=(function)`| (initial, warning)| `<number: 1>` |
| `mode=(null)`| (initial)| `<number: 1>` |
| `mode=(undefined)`| (initial)| `<number: 1>` |

## `multiple` (on `<select>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `multiple=(string)`| (changed)| `<boolean: true>` |
| `multiple=(empty string)`| (initial)| `<boolean: false>` |
| `multiple=(array with string)`| (changed)| `<boolean: true>` |
| `multiple=(empty array)`| (changed)| `<boolean: true>` |
| `multiple=(object)`| (changed)| `<boolean: true>` |
| `multiple=(numeric string)`| (changed)| `<boolean: true>` |
| `multiple=(-1)`| (changed)| `<boolean: true>` |
| `multiple=(0)`| (initial)| `<boolean: false>` |
| `multiple=(integer)`| (changed)| `<boolean: true>` |
| `multiple=(NaN)`| (initial, warning)| `<boolean: false>` |
| `multiple=(float)`| (changed)| `<boolean: true>` |
| `multiple=(true)`| (changed)| `<boolean: true>` |
| `multiple=(false)`| (initial)| `<boolean: false>` |
| `multiple=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `multiple=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `multiple=(string 'on')`| (changed)| `<boolean: true>` |
| `multiple=(string 'off')`| (changed)| `<boolean: true>` |
| `multiple=(symbol)`| (changed, warning, ssr mismatch)| `<boolean: true>` |
| `multiple=(function)`| (changed, warning, ssr mismatch)| `<boolean: true>` |
| `multiple=(null)`| (initial)| `<boolean: false>` |
| `multiple=(undefined)`| (initial)| `<boolean: false>` |

## `muted` (on `<video>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `muted=(string)`| (changed)| `<boolean: true>` |
| `muted=(empty string)`| (initial)| `<boolean: false>` |
| `muted=(array with string)`| (changed)| `<boolean: true>` |
| `muted=(empty array)`| (changed)| `<boolean: true>` |
| `muted=(object)`| (changed)| `<boolean: true>` |
| `muted=(numeric string)`| (changed)| `<boolean: true>` |
| `muted=(-1)`| (changed)| `<boolean: true>` |
| `muted=(0)`| (initial)| `<boolean: false>` |
| `muted=(integer)`| (changed)| `<boolean: true>` |
| `muted=(NaN)`| (initial, warning)| `<boolean: false>` |
| `muted=(float)`| (changed)| `<boolean: true>` |
| `muted=(true)`| (changed)| `<boolean: true>` |
| `muted=(false)`| (initial)| `<boolean: false>` |
| `muted=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `muted=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `muted=(string 'on')`| (changed)| `<boolean: true>` |
| `muted=(string 'off')`| (changed)| `<boolean: true>` |
| `muted=(symbol)`| (initial, warning)| `<boolean: false>` |
| `muted=(function)`| (initial, warning)| `<boolean: false>` |
| `muted=(null)`| (initial)| `<boolean: false>` |
| `muted=(undefined)`| (initial)| `<boolean: false>` |

## `name` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `name=(string)`| (changed)| `"a string"` |
| `name=(empty string)`| (initial)| `<empty string>` |
| `name=(array with string)`| (changed)| `"string"` |
| `name=(empty array)`| (initial)| `<empty string>` |
| `name=(object)`| (changed)| `"result of toString()"` |
| `name=(numeric string)`| (changed)| `"42"` |
| `name=(-1)`| (changed)| `"-1"` |
| `name=(0)`| (changed)| `"0"` |
| `name=(integer)`| (changed)| `"1"` |
| `name=(NaN)`| (changed, warning)| `"NaN"` |
| `name=(float)`| (changed)| `"99.99"` |
| `name=(true)`| (initial, warning)| `<empty string>` |
| `name=(false)`| (initial, warning)| `<empty string>` |
| `name=(string 'true')`| (changed)| `"true"` |
| `name=(string 'false')`| (changed)| `"false"` |
| `name=(string 'on')`| (changed)| `"on"` |
| `name=(string 'off')`| (changed)| `"off"` |
| `name=(symbol)`| (initial, warning)| `<empty string>` |
| `name=(function)`| (initial, warning)| `<empty string>` |
| `name=(null)`| (initial)| `<empty string>` |
| `name=(undefined)`| (initial)| `<empty string>` |

## `name` (on `<color-profile>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `name=(string)`| (initial)| `<null>` |
| `name=(empty string)`| (initial)| `<null>` |
| `name=(array with string)`| (initial)| `<null>` |
| `name=(empty array)`| (initial)| `<null>` |
| `name=(object)`| (initial)| `<null>` |
| `name=(numeric string)`| (initial)| `<null>` |
| `name=(-1)`| (initial)| `<null>` |
| `name=(0)`| (initial)| `<null>` |
| `name=(integer)`| (initial)| `<null>` |
| `name=(NaN)`| (initial, warning)| `<null>` |
| `name=(float)`| (initial)| `<null>` |
| `name=(true)`| (initial, warning)| `<null>` |
| `name=(false)`| (initial, warning)| `<null>` |
| `name=(string 'true')`| (initial)| `<null>` |
| `name=(string 'false')`| (initial)| `<null>` |
| `name=(string 'on')`| (initial)| `<null>` |
| `name=(string 'off')`| (initial)| `<null>` |
| `name=(symbol)`| (initial, warning)| `<null>` |
| `name=(function)`| (initial, warning)| `<null>` |
| `name=(null)`| (initial)| `<null>` |
| `name=(undefined)`| (initial)| `<null>` |

## `noModule` (on `<script>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `noModule=(string)`| (changed)| `<boolean: true>` |
| `noModule=(empty string)`| (initial)| `<boolean: false>` |
| `noModule=(array with string)`| (changed)| `<boolean: true>` |
| `noModule=(empty array)`| (changed)| `<boolean: true>` |
| `noModule=(object)`| (changed)| `<boolean: true>` |
| `noModule=(numeric string)`| (changed)| `<boolean: true>` |
| `noModule=(-1)`| (changed)| `<boolean: true>` |
| `noModule=(0)`| (initial)| `<boolean: false>` |
| `noModule=(integer)`| (changed)| `<boolean: true>` |
| `noModule=(NaN)`| (initial, warning)| `<boolean: false>` |
| `noModule=(float)`| (changed)| `<boolean: true>` |
| `noModule=(true)`| (changed)| `<boolean: true>` |
| `noModule=(false)`| (initial)| `<boolean: false>` |
| `noModule=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `noModule=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `noModule=(string 'on')`| (changed)| `<boolean: true>` |
| `noModule=(string 'off')`| (changed)| `<boolean: true>` |
| `noModule=(symbol)`| (initial, warning)| `<boolean: false>` |
| `noModule=(function)`| (initial, warning)| `<boolean: false>` |
| `noModule=(null)`| (initial)| `<boolean: false>` |
| `noModule=(undefined)`| (initial)| `<boolean: false>` |

## `nonce` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `nonce=(string)`| (changed)| `"a string"` |
| `nonce=(empty string)`| (changed)| `<empty string>` |
| `nonce=(array with string)`| (changed)| `"string"` |
| `nonce=(empty array)`| (changed)| `<empty string>` |
| `nonce=(object)`| (changed)| `"result of toString()"` |
| `nonce=(numeric string)`| (changed)| `"42"` |
| `nonce=(-1)`| (changed)| `"-1"` |
| `nonce=(0)`| (changed)| `"0"` |
| `nonce=(integer)`| (changed)| `"1"` |
| `nonce=(NaN)`| (changed, warning)| `"NaN"` |
| `nonce=(float)`| (changed)| `"99.99"` |
| `nonce=(true)`| (initial, warning)| `<null>` |
| `nonce=(false)`| (initial, warning)| `<null>` |
| `nonce=(string 'true')`| (changed)| `"true"` |
| `nonce=(string 'false')`| (changed)| `"false"` |
| `nonce=(string 'on')`| (changed)| `"on"` |
| `nonce=(string 'off')`| (changed)| `"off"` |
| `nonce=(symbol)`| (initial, warning)| `<null>` |
| `nonce=(function)`| (initial, warning)| `<null>` |
| `nonce=(null)`| (initial)| `<null>` |
| `nonce=(undefined)`| (initial)| `<null>` |

## `noValidate` (on `<form>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `noValidate=(string)`| (changed)| `<boolean: true>` |
| `noValidate=(empty string)`| (initial)| `<boolean: false>` |
| `noValidate=(array with string)`| (changed)| `<boolean: true>` |
| `noValidate=(empty array)`| (changed)| `<boolean: true>` |
| `noValidate=(object)`| (changed)| `<boolean: true>` |
| `noValidate=(numeric string)`| (changed)| `<boolean: true>` |
| `noValidate=(-1)`| (changed)| `<boolean: true>` |
| `noValidate=(0)`| (initial)| `<boolean: false>` |
| `noValidate=(integer)`| (changed)| `<boolean: true>` |
| `noValidate=(NaN)`| (initial, warning)| `<boolean: false>` |
| `noValidate=(float)`| (changed)| `<boolean: true>` |
| `noValidate=(true)`| (changed)| `<boolean: true>` |
| `noValidate=(false)`| (initial)| `<boolean: false>` |
| `noValidate=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `noValidate=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `noValidate=(string 'on')`| (changed)| `<boolean: true>` |
| `noValidate=(string 'off')`| (changed)| `<boolean: true>` |
| `noValidate=(symbol)`| (initial, warning)| `<boolean: false>` |
| `noValidate=(function)`| (initial, warning)| `<boolean: false>` |
| `noValidate=(null)`| (initial)| `<boolean: false>` |
| `noValidate=(undefined)`| (initial)| `<boolean: false>` |

## `numOctaves` (on `<feTurbulence>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `numOctaves=(string)`| (initial)| `<number: 1>` |
| `numOctaves=(empty string)`| (changed)| `<number: 0>` |
| `numOctaves=(array with string)`| (initial)| `<number: 1>` |
| `numOctaves=(empty array)`| (changed)| `<number: 0>` |
| `numOctaves=(object)`| (initial)| `<number: 1>` |
| `numOctaves=(numeric string)`| (changed)| `<number: 42>` |
| `numOctaves=(-1)`| (changed)| `<number: -1>` |
| `numOctaves=(0)`| (changed)| `<number: 0>` |
| `numOctaves=(integer)`| (initial)| `<number: 1>` |
| `numOctaves=(NaN)`| (initial, warning)| `<number: 1>` |
| `numOctaves=(float)`| (initial)| `<number: 1>` |
| `numOctaves=(true)`| (initial, warning)| `<number: 1>` |
| `numOctaves=(false)`| (initial, warning)| `<number: 1>` |
| `numOctaves=(string 'true')`| (initial)| `<number: 1>` |
| `numOctaves=(string 'false')`| (initial)| `<number: 1>` |
| `numOctaves=(string 'on')`| (initial)| `<number: 1>` |
| `numOctaves=(string 'off')`| (initial)| `<number: 1>` |
| `numOctaves=(symbol)`| (initial, warning)| `<number: 1>` |
| `numOctaves=(function)`| (initial, warning)| `<number: 1>` |
| `numOctaves=(null)`| (initial)| `<number: 1>` |
| `numOctaves=(undefined)`| (initial)| `<number: 1>` |

## `offset` (on `<stop>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `offset=(string)`| (initial)| `<number: 0>` |
| `offset=(empty string)`| (initial)| `<number: 0>` |
| `offset=(array with string)`| (initial)| `<number: 0>` |
| `offset=(empty array)`| (initial)| `<number: 0>` |
| `offset=(object)`| (initial)| `<number: 0>` |
| `offset=(numeric string)`| (changed)| `<number: 42>` |
| `offset=(-1)`| (changed)| `<number: -1>` |
| `offset=(0)`| (initial)| `<number: 0>` |
| `offset=(integer)`| (changed)| `<number: 1>` |
| `offset=(NaN)`| (initial, warning)| `<number: 0>` |
| `offset=(float)`| (changed)| `<number: 99.98999786376953>` |
| `offset=(true)`| (initial, warning)| `<number: 0>` |
| `offset=(false)`| (initial, warning)| `<number: 0>` |
| `offset=(string 'true')`| (initial)| `<number: 0>` |
| `offset=(string 'false')`| (initial)| `<number: 0>` |
| `offset=(string 'on')`| (initial)| `<number: 0>` |
| `offset=(string 'off')`| (initial)| `<number: 0>` |
| `offset=(symbol)`| (initial, warning)| `<number: 0>` |
| `offset=(function)`| (initial, warning)| `<number: 0>` |
| `offset=(null)`| (initial)| `<number: 0>` |
| `offset=(undefined)`| (initial)| `<number: 0>` |

## `on-click` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `on-click=(string)`| (initial, warning)| `<undefined>` |
| `on-click=(empty string)`| (initial, warning)| `<undefined>` |
| `on-click=(array with string)`| (initial, warning)| `<undefined>` |
| `on-click=(empty array)`| (initial, warning)| `<undefined>` |
| `on-click=(object)`| (initial, warning)| `<undefined>` |
| `on-click=(numeric string)`| (initial, warning)| `<undefined>` |
| `on-click=(-1)`| (initial, warning)| `<undefined>` |
| `on-click=(0)`| (initial, warning)| `<undefined>` |
| `on-click=(integer)`| (initial, warning)| `<undefined>` |
| `on-click=(NaN)`| (initial, warning)| `<undefined>` |
| `on-click=(float)`| (initial, warning)| `<undefined>` |
| `on-click=(true)`| (initial, warning)| `<undefined>` |
| `on-click=(false)`| (initial, warning)| `<undefined>` |
| `on-click=(string 'true')`| (initial, warning)| `<undefined>` |
| `on-click=(string 'false')`| (initial, warning)| `<undefined>` |
| `on-click=(string 'on')`| (initial, warning)| `<undefined>` |
| `on-click=(string 'off')`| (initial, warning)| `<undefined>` |
| `on-click=(symbol)`| (initial, warning)| `<undefined>` |
| `on-click=(function)`| (initial, warning)| `<undefined>` |
| `on-click=(null)`| (initial, warning)| `<undefined>` |
| `on-click=(undefined)`| (initial, warning)| `<undefined>` |

## `on-unknownevent` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `on-unknownevent=(string)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(empty string)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(array with string)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(empty array)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(object)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(numeric string)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(-1)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(0)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(integer)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(NaN)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(float)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(true)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(false)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(string 'true')`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(string 'false')`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(string 'on')`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(string 'off')`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(symbol)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(function)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(null)`| (initial, warning)| `<undefined>` |
| `on-unknownevent=(undefined)`| (initial, warning)| `<undefined>` |

## `onclick` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `onclick=(string)`| (initial, warning)| `<null>` |
| `onclick=(empty string)`| (initial, warning)| `<null>` |
| `onclick=(array with string)`| (initial, warning)| `<null>` |
| `onclick=(empty array)`| (initial, warning)| `<null>` |
| `onclick=(object)`| (initial, warning)| `<null>` |
| `onclick=(numeric string)`| (initial, warning)| `<null>` |
| `onclick=(-1)`| (initial, warning)| `<null>` |
| `onclick=(0)`| (initial, warning)| `<null>` |
| `onclick=(integer)`| (initial, warning)| `<null>` |
| `onclick=(NaN)`| (initial, warning)| `<null>` |
| `onclick=(float)`| (initial, warning)| `<null>` |
| `onclick=(true)`| (initial, warning)| `<null>` |
| `onclick=(false)`| (initial, warning)| `<null>` |
| `onclick=(string 'true')`| (initial, warning)| `<null>` |
| `onclick=(string 'false')`| (initial, warning)| `<null>` |
| `onclick=(string 'on')`| (initial, warning)| `<null>` |
| `onclick=(string 'off')`| (initial, warning)| `<null>` |
| `onclick=(symbol)`| (initial, warning)| `<null>` |
| `onclick=(function)`| (initial, warning)| `<null>` |
| `onclick=(null)`| (initial, warning)| `<null>` |
| `onclick=(undefined)`| (initial, warning)| `<null>` |

## `onClick` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `onClick=(string)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(empty string)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(array with string)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(empty array)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(object)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(numeric string)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(-1)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(0)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(integer)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(NaN)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(float)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(true)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(false)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(string 'true')`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(string 'false')`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(string 'on')`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(string 'off')`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(symbol)`| (initial, warning, ssr warning)| `<undefined>` |
| `onClick=(function)`| (initial)| `<undefined>` |
| `onClick=(null)`| (initial)| `<undefined>` |
| `onClick=(undefined)`| (initial)| `<undefined>` |

## `onunknownevent` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `onunknownevent=(string)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(empty string)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(array with string)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(empty array)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(object)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(numeric string)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(-1)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(0)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(integer)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(NaN)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(float)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(true)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(false)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(string 'true')`| (initial, warning)| `<undefined>` |
| `onunknownevent=(string 'false')`| (initial, warning)| `<undefined>` |
| `onunknownevent=(string 'on')`| (initial, warning)| `<undefined>` |
| `onunknownevent=(string 'off')`| (initial, warning)| `<undefined>` |
| `onunknownevent=(symbol)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(function)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(null)`| (initial, warning)| `<undefined>` |
| `onunknownevent=(undefined)`| (initial, warning)| `<undefined>` |

## `onUnknownEvent` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `onUnknownEvent=(string)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(empty string)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(array with string)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(empty array)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(object)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(numeric string)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(-1)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(0)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(integer)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(NaN)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(float)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(true)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(false)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(string 'true')`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(string 'false')`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(string 'on')`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(string 'off')`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(symbol)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(function)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(null)`| (initial, warning, ssr warning)| `<undefined>` |
| `onUnknownEvent=(undefined)`| (initial, warning, ssr warning)| `<undefined>` |

## `opacity` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `opacity=(string)`| (changed)| `"a string"` |
| `opacity=(empty string)`| (changed)| `<empty string>` |
| `opacity=(array with string)`| (changed)| `"string"` |
| `opacity=(empty array)`| (changed)| `<empty string>` |
| `opacity=(object)`| (changed)| `"result of toString()"` |
| `opacity=(numeric string)`| (changed)| `"42"` |
| `opacity=(-1)`| (changed)| `"-1"` |
| `opacity=(0)`| (changed)| `"0"` |
| `opacity=(integer)`| (changed)| `"1"` |
| `opacity=(NaN)`| (changed, warning)| `"NaN"` |
| `opacity=(float)`| (changed)| `"99.99"` |
| `opacity=(true)`| (initial, warning)| `<null>` |
| `opacity=(false)`| (initial, warning)| `<null>` |
| `opacity=(string 'true')`| (changed)| `"true"` |
| `opacity=(string 'false')`| (changed)| `"false"` |
| `opacity=(string 'on')`| (changed)| `"on"` |
| `opacity=(string 'off')`| (changed)| `"off"` |
| `opacity=(symbol)`| (initial, warning)| `<null>` |
| `opacity=(function)`| (initial, warning)| `<null>` |
| `opacity=(null)`| (initial)| `<null>` |
| `opacity=(undefined)`| (initial)| `<null>` |

## `open` (on `<details>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `open=(string)`| (changed)| `<boolean: true>` |
| `open=(empty string)`| (initial)| `<boolean: false>` |
| `open=(array with string)`| (changed)| `<boolean: true>` |
| `open=(empty array)`| (changed)| `<boolean: true>` |
| `open=(object)`| (changed)| `<boolean: true>` |
| `open=(numeric string)`| (changed)| `<boolean: true>` |
| `open=(-1)`| (changed)| `<boolean: true>` |
| `open=(0)`| (initial)| `<boolean: false>` |
| `open=(integer)`| (changed)| `<boolean: true>` |
| `open=(NaN)`| (initial, warning)| `<boolean: false>` |
| `open=(float)`| (changed)| `<boolean: true>` |
| `open=(true)`| (changed)| `<boolean: true>` |
| `open=(false)`| (initial)| `<boolean: false>` |
| `open=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `open=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `open=(string 'on')`| (changed)| `<boolean: true>` |
| `open=(string 'off')`| (changed)| `<boolean: true>` |
| `open=(symbol)`| (initial, warning)| `<boolean: false>` |
| `open=(function)`| (initial, warning)| `<boolean: false>` |
| `open=(null)`| (initial)| `<boolean: false>` |
| `open=(undefined)`| (initial)| `<boolean: false>` |

## `operator` (on `<feComposite>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `operator=(string)`| (changed)| `<number: 5>` |
| `operator=(empty string)`| (initial)| `<number: 1>` |
| `operator=(array with string)`| (changed)| `<number: 5>` |
| `operator=(empty array)`| (initial)| `<number: 1>` |
| `operator=(object)`| (initial)| `<number: 1>` |
| `operator=(numeric string)`| (initial)| `<number: 1>` |
| `operator=(-1)`| (initial)| `<number: 1>` |
| `operator=(0)`| (initial)| `<number: 1>` |
| `operator=(integer)`| (initial)| `<number: 1>` |
| `operator=(NaN)`| (initial, warning)| `<number: 1>` |
| `operator=(float)`| (initial)| `<number: 1>` |
| `operator=(true)`| (initial, warning)| `<number: 1>` |
| `operator=(false)`| (initial, warning)| `<number: 1>` |
| `operator=(string 'true')`| (initial)| `<number: 1>` |
| `operator=(string 'false')`| (initial)| `<number: 1>` |
| `operator=(string 'on')`| (initial)| `<number: 1>` |
| `operator=(string 'off')`| (initial)| `<number: 1>` |
| `operator=(symbol)`| (initial, warning)| `<number: 1>` |
| `operator=(function)`| (initial, warning)| `<number: 1>` |
| `operator=(null)`| (initial)| `<number: 1>` |
| `operator=(undefined)`| (initial)| `<number: 1>` |

## `optimum` (on `<meter>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `optimum=(string)`| (initial)| `<number: 0.5>` |
| `optimum=(empty string)`| (initial)| `<number: 0.5>` |
| `optimum=(array with string)`| (initial)| `<number: 0.5>` |
| `optimum=(empty array)`| (initial)| `<number: 0.5>` |
| `optimum=(object)`| (initial)| `<number: 0.5>` |
| `optimum=(numeric string)`| (changed)| `<number: 1>` |
| `optimum=(-1)`| (changed)| `<number: 0>` |
| `optimum=(0)`| (changed)| `<number: 0>` |
| `optimum=(integer)`| (changed)| `<number: 1>` |
| `optimum=(NaN)`| (initial, warning)| `<number: 0.5>` |
| `optimum=(float)`| (changed)| `<number: 1>` |
| `optimum=(true)`| (initial, warning)| `<number: 0.5>` |
| `optimum=(false)`| (initial, warning)| `<number: 0.5>` |
| `optimum=(string 'true')`| (initial)| `<number: 0.5>` |
| `optimum=(string 'false')`| (initial)| `<number: 0.5>` |
| `optimum=(string 'on')`| (initial)| `<number: 0.5>` |
| `optimum=(string 'off')`| (initial)| `<number: 0.5>` |
| `optimum=(symbol)`| (initial, warning)| `<number: 0.5>` |
| `optimum=(function)`| (initial, warning)| `<number: 0.5>` |
| `optimum=(null)`| (initial)| `<number: 0.5>` |
| `optimum=(undefined)`| (initial)| `<number: 0.5>` |

## `order` (on `<feConvolveMatrix>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `order=(string)`| (changed)| `"a string"` |
| `order=(empty string)`| (changed)| `<empty string>` |
| `order=(array with string)`| (changed)| `"string"` |
| `order=(empty array)`| (changed)| `<empty string>` |
| `order=(object)`| (changed)| `"result of toString()"` |
| `order=(numeric string)`| (changed)| `"42"` |
| `order=(-1)`| (changed)| `"-1"` |
| `order=(0)`| (changed)| `"0"` |
| `order=(integer)`| (changed)| `"1"` |
| `order=(NaN)`| (changed, warning)| `"NaN"` |
| `order=(float)`| (changed)| `"99.99"` |
| `order=(true)`| (initial, warning)| `<null>` |
| `order=(false)`| (initial, warning)| `<null>` |
| `order=(string 'true')`| (changed)| `"true"` |
| `order=(string 'false')`| (changed)| `"false"` |
| `order=(string 'on')`| (changed)| `"on"` |
| `order=(string 'off')`| (changed)| `"off"` |
| `order=(symbol)`| (initial, warning)| `<null>` |
| `order=(function)`| (initial, warning)| `<null>` |
| `order=(null)`| (initial)| `<null>` |
| `order=(undefined)`| (initial)| `<null>` |

## `orient` (on `<marker>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `orient=(string)`| (changed)| `"a string"` |
| `orient=(empty string)`| (changed)| `<empty string>` |
| `orient=(array with string)`| (changed)| `"string"` |
| `orient=(empty array)`| (changed)| `<empty string>` |
| `orient=(object)`| (changed)| `"result of toString()"` |
| `orient=(numeric string)`| (changed)| `"42"` |
| `orient=(-1)`| (changed)| `"-1"` |
| `orient=(0)`| (changed)| `"0"` |
| `orient=(integer)`| (changed)| `"1"` |
| `orient=(NaN)`| (changed, warning)| `"NaN"` |
| `orient=(float)`| (changed)| `"99.99"` |
| `orient=(true)`| (initial, warning)| `<null>` |
| `orient=(false)`| (initial, warning)| `<null>` |
| `orient=(string 'true')`| (changed)| `"true"` |
| `orient=(string 'false')`| (changed)| `"false"` |
| `orient=(string 'on')`| (changed)| `"on"` |
| `orient=(string 'off')`| (changed)| `"off"` |
| `orient=(symbol)`| (initial, warning)| `<null>` |
| `orient=(function)`| (initial, warning)| `<null>` |
| `orient=(null)`| (initial)| `<null>` |
| `orient=(undefined)`| (initial)| `<null>` |

## `orientation` (on `<glyph>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `orientation=(string)`| (changed)| `"a string"` |
| `orientation=(empty string)`| (changed)| `<empty string>` |
| `orientation=(array with string)`| (changed)| `"string"` |
| `orientation=(empty array)`| (changed)| `<empty string>` |
| `orientation=(object)`| (changed)| `"result of toString()"` |
| `orientation=(numeric string)`| (changed)| `"42"` |
| `orientation=(-1)`| (changed)| `"-1"` |
| `orientation=(0)`| (changed)| `"0"` |
| `orientation=(integer)`| (changed)| `"1"` |
| `orientation=(NaN)`| (changed, warning)| `"NaN"` |
| `orientation=(float)`| (changed)| `"99.99"` |
| `orientation=(true)`| (initial, warning)| `<null>` |
| `orientation=(false)`| (initial, warning)| `<null>` |
| `orientation=(string 'true')`| (changed)| `"true"` |
| `orientation=(string 'false')`| (changed)| `"false"` |
| `orientation=(string 'on')`| (changed)| `"on"` |
| `orientation=(string 'off')`| (changed)| `"off"` |
| `orientation=(symbol)`| (initial, warning)| `<null>` |
| `orientation=(function)`| (initial, warning)| `<null>` |
| `orientation=(null)`| (initial)| `<null>` |
| `orientation=(undefined)`| (initial)| `<null>` |

## `origin` (on `<animateMotion>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `origin=(string)`| (changed)| `"a string"` |
| `origin=(empty string)`| (changed)| `<empty string>` |
| `origin=(array with string)`| (changed)| `"string"` |
| `origin=(empty array)`| (changed)| `<empty string>` |
| `origin=(object)`| (changed)| `"result of toString()"` |
| `origin=(numeric string)`| (changed)| `"42"` |
| `origin=(-1)`| (changed)| `"-1"` |
| `origin=(0)`| (changed)| `"0"` |
| `origin=(integer)`| (changed)| `"1"` |
| `origin=(NaN)`| (changed, warning)| `"NaN"` |
| `origin=(float)`| (changed)| `"99.99"` |
| `origin=(true)`| (initial, warning)| `<null>` |
| `origin=(false)`| (initial, warning)| `<null>` |
| `origin=(string 'true')`| (changed)| `"true"` |
| `origin=(string 'false')`| (changed)| `"false"` |
| `origin=(string 'on')`| (changed)| `"on"` |
| `origin=(string 'off')`| (changed)| `"off"` |
| `origin=(symbol)`| (initial, warning)| `<null>` |
| `origin=(function)`| (initial, warning)| `<null>` |
| `origin=(null)`| (initial)| `<null>` |
| `origin=(undefined)`| (initial)| `<null>` |

## `overflow` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `overflow=(string)`| (changed)| `"a string"` |
| `overflow=(empty string)`| (changed)| `<empty string>` |
| `overflow=(array with string)`| (changed)| `"string"` |
| `overflow=(empty array)`| (changed)| `<empty string>` |
| `overflow=(object)`| (changed)| `"result of toString()"` |
| `overflow=(numeric string)`| (changed)| `"42"` |
| `overflow=(-1)`| (changed)| `"-1"` |
| `overflow=(0)`| (changed)| `"0"` |
| `overflow=(integer)`| (changed)| `"1"` |
| `overflow=(NaN)`| (changed, warning)| `"NaN"` |
| `overflow=(float)`| (changed)| `"99.99"` |
| `overflow=(true)`| (initial, warning)| `<null>` |
| `overflow=(false)`| (initial, warning)| `<null>` |
| `overflow=(string 'true')`| (changed)| `"true"` |
| `overflow=(string 'false')`| (changed)| `"false"` |
| `overflow=(string 'on')`| (changed)| `"on"` |
| `overflow=(string 'off')`| (changed)| `"off"` |
| `overflow=(symbol)`| (initial, warning)| `<null>` |
| `overflow=(function)`| (initial, warning)| `<null>` |
| `overflow=(null)`| (initial)| `<null>` |
| `overflow=(undefined)`| (initial)| `<null>` |

## `overline-position` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `overline-position=(string)`| (changed, warning)| `"a string"` |
| `overline-position=(empty string)`| (changed, warning)| `<empty string>` |
| `overline-position=(array with string)`| (changed, warning)| `"string"` |
| `overline-position=(empty array)`| (changed, warning)| `<empty string>` |
| `overline-position=(object)`| (changed, warning)| `"result of toString()"` |
| `overline-position=(numeric string)`| (changed, warning)| `"42"` |
| `overline-position=(-1)`| (changed, warning)| `"-1"` |
| `overline-position=(0)`| (changed, warning)| `"0"` |
| `overline-position=(integer)`| (changed, warning)| `"1"` |
| `overline-position=(NaN)`| (changed, warning)| `"NaN"` |
| `overline-position=(float)`| (changed, warning)| `"99.99"` |
| `overline-position=(true)`| (initial, warning)| `<null>` |
| `overline-position=(false)`| (initial, warning)| `<null>` |
| `overline-position=(string 'true')`| (changed, warning)| `"true"` |
| `overline-position=(string 'false')`| (changed, warning)| `"false"` |
| `overline-position=(string 'on')`| (changed, warning)| `"on"` |
| `overline-position=(string 'off')`| (changed, warning)| `"off"` |
| `overline-position=(symbol)`| (initial, warning)| `<null>` |
| `overline-position=(function)`| (initial, warning)| `<null>` |
| `overline-position=(null)`| (initial, warning)| `<null>` |
| `overline-position=(undefined)`| (initial, warning)| `<null>` |

## `overline-thickness` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `overline-thickness=(string)`| (changed, warning)| `"a string"` |
| `overline-thickness=(empty string)`| (changed, warning)| `<empty string>` |
| `overline-thickness=(array with string)`| (changed, warning)| `"string"` |
| `overline-thickness=(empty array)`| (changed, warning)| `<empty string>` |
| `overline-thickness=(object)`| (changed, warning)| `"result of toString()"` |
| `overline-thickness=(numeric string)`| (changed, warning)| `"42"` |
| `overline-thickness=(-1)`| (changed, warning)| `"-1"` |
| `overline-thickness=(0)`| (changed, warning)| `"0"` |
| `overline-thickness=(integer)`| (changed, warning)| `"1"` |
| `overline-thickness=(NaN)`| (changed, warning)| `"NaN"` |
| `overline-thickness=(float)`| (changed, warning)| `"99.99"` |
| `overline-thickness=(true)`| (initial, warning)| `<null>` |
| `overline-thickness=(false)`| (initial, warning)| `<null>` |
| `overline-thickness=(string 'true')`| (changed, warning)| `"true"` |
| `overline-thickness=(string 'false')`| (changed, warning)| `"false"` |
| `overline-thickness=(string 'on')`| (changed, warning)| `"on"` |
| `overline-thickness=(string 'off')`| (changed, warning)| `"off"` |
| `overline-thickness=(symbol)`| (initial, warning)| `<null>` |
| `overline-thickness=(function)`| (initial, warning)| `<null>` |
| `overline-thickness=(null)`| (initial, warning)| `<null>` |
| `overline-thickness=(undefined)`| (initial, warning)| `<null>` |

## `overlinePosition` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `overlinePosition=(string)`| (changed)| `"a string"` |
| `overlinePosition=(empty string)`| (changed)| `<empty string>` |
| `overlinePosition=(array with string)`| (changed)| `"string"` |
| `overlinePosition=(empty array)`| (changed)| `<empty string>` |
| `overlinePosition=(object)`| (changed)| `"result of toString()"` |
| `overlinePosition=(numeric string)`| (changed)| `"42"` |
| `overlinePosition=(-1)`| (changed)| `"-1"` |
| `overlinePosition=(0)`| (changed)| `"0"` |
| `overlinePosition=(integer)`| (changed)| `"1"` |
| `overlinePosition=(NaN)`| (changed, warning)| `"NaN"` |
| `overlinePosition=(float)`| (changed)| `"99.99"` |
| `overlinePosition=(true)`| (initial, warning)| `<null>` |
| `overlinePosition=(false)`| (initial, warning)| `<null>` |
| `overlinePosition=(string 'true')`| (changed)| `"true"` |
| `overlinePosition=(string 'false')`| (changed)| `"false"` |
| `overlinePosition=(string 'on')`| (changed)| `"on"` |
| `overlinePosition=(string 'off')`| (changed)| `"off"` |
| `overlinePosition=(symbol)`| (initial, warning)| `<null>` |
| `overlinePosition=(function)`| (initial, warning)| `<null>` |
| `overlinePosition=(null)`| (initial)| `<null>` |
| `overlinePosition=(undefined)`| (initial)| `<null>` |

## `overlineThickness` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `overlineThickness=(string)`| (changed)| `"a string"` |
| `overlineThickness=(empty string)`| (changed)| `<empty string>` |
| `overlineThickness=(array with string)`| (changed)| `"string"` |
| `overlineThickness=(empty array)`| (changed)| `<empty string>` |
| `overlineThickness=(object)`| (changed)| `"result of toString()"` |
| `overlineThickness=(numeric string)`| (changed)| `"42"` |
| `overlineThickness=(-1)`| (changed)| `"-1"` |
| `overlineThickness=(0)`| (changed)| `"0"` |
| `overlineThickness=(integer)`| (changed)| `"1"` |
| `overlineThickness=(NaN)`| (changed, warning)| `"NaN"` |
| `overlineThickness=(float)`| (changed)| `"99.99"` |
| `overlineThickness=(true)`| (initial, warning)| `<null>` |
| `overlineThickness=(false)`| (initial, warning)| `<null>` |
| `overlineThickness=(string 'true')`| (changed)| `"true"` |
| `overlineThickness=(string 'false')`| (changed)| `"false"` |
| `overlineThickness=(string 'on')`| (changed)| `"on"` |
| `overlineThickness=(string 'off')`| (changed)| `"off"` |
| `overlineThickness=(symbol)`| (initial, warning)| `<null>` |
| `overlineThickness=(function)`| (initial, warning)| `<null>` |
| `overlineThickness=(null)`| (initial)| `<null>` |
| `overlineThickness=(undefined)`| (initial)| `<null>` |

## `paint-order` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `paint-order=(string)`| (changed, warning)| `"a string"` |
| `paint-order=(empty string)`| (changed, warning)| `<empty string>` |
| `paint-order=(array with string)`| (changed, warning)| `"string"` |
| `paint-order=(empty array)`| (changed, warning)| `<empty string>` |
| `paint-order=(object)`| (changed, warning)| `"result of toString()"` |
| `paint-order=(numeric string)`| (changed, warning)| `"42"` |
| `paint-order=(-1)`| (changed, warning)| `"-1"` |
| `paint-order=(0)`| (changed, warning)| `"0"` |
| `paint-order=(integer)`| (changed, warning)| `"1"` |
| `paint-order=(NaN)`| (changed, warning)| `"NaN"` |
| `paint-order=(float)`| (changed, warning)| `"99.99"` |
| `paint-order=(true)`| (initial, warning)| `<null>` |
| `paint-order=(false)`| (initial, warning)| `<null>` |
| `paint-order=(string 'true')`| (changed, warning)| `"true"` |
| `paint-order=(string 'false')`| (changed, warning)| `"false"` |
| `paint-order=(string 'on')`| (changed, warning)| `"on"` |
| `paint-order=(string 'off')`| (changed, warning)| `"off"` |
| `paint-order=(symbol)`| (initial, warning)| `<null>` |
| `paint-order=(function)`| (initial, warning)| `<null>` |
| `paint-order=(null)`| (initial, warning)| `<null>` |
| `paint-order=(undefined)`| (initial, warning)| `<null>` |

## `paintOrder` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `paintOrder=(string)`| (changed)| `"a string"` |
| `paintOrder=(empty string)`| (changed)| `<empty string>` |
| `paintOrder=(array with string)`| (changed)| `"string"` |
| `paintOrder=(empty array)`| (changed)| `<empty string>` |
| `paintOrder=(object)`| (changed)| `"result of toString()"` |
| `paintOrder=(numeric string)`| (changed)| `"42"` |
| `paintOrder=(-1)`| (changed)| `"-1"` |
| `paintOrder=(0)`| (changed)| `"0"` |
| `paintOrder=(integer)`| (changed)| `"1"` |
| `paintOrder=(NaN)`| (changed, warning)| `"NaN"` |
| `paintOrder=(float)`| (changed)| `"99.99"` |
| `paintOrder=(true)`| (initial, warning)| `<null>` |
| `paintOrder=(false)`| (initial, warning)| `<null>` |
| `paintOrder=(string 'true')`| (changed)| `"true"` |
| `paintOrder=(string 'false')`| (changed)| `"false"` |
| `paintOrder=(string 'on')`| (changed)| `"on"` |
| `paintOrder=(string 'off')`| (changed)| `"off"` |
| `paintOrder=(symbol)`| (initial, warning)| `<null>` |
| `paintOrder=(function)`| (initial, warning)| `<null>` |
| `paintOrder=(null)`| (initial)| `<null>` |
| `paintOrder=(undefined)`| (initial)| `<null>` |

## `panose-1` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `panose-1=(string)`| (changed, warning)| `"a string"` |
| `panose-1=(empty string)`| (changed, warning)| `<empty string>` |
| `panose-1=(array with string)`| (changed, warning)| `"string"` |
| `panose-1=(empty array)`| (changed, warning)| `<empty string>` |
| `panose-1=(object)`| (changed, warning)| `"result of toString()"` |
| `panose-1=(numeric string)`| (changed, warning)| `"42"` |
| `panose-1=(-1)`| (changed, warning)| `"-1"` |
| `panose-1=(0)`| (changed, warning)| `"0"` |
| `panose-1=(integer)`| (changed, warning)| `"1"` |
| `panose-1=(NaN)`| (changed, warning)| `"NaN"` |
| `panose-1=(float)`| (changed, warning)| `"99.99"` |
| `panose-1=(true)`| (initial, warning)| `<null>` |
| `panose-1=(false)`| (initial, warning)| `<null>` |
| `panose-1=(string 'true')`| (changed, warning)| `"true"` |
| `panose-1=(string 'false')`| (changed, warning)| `"false"` |
| `panose-1=(string 'on')`| (changed, warning)| `"on"` |
| `panose-1=(string 'off')`| (changed, warning)| `"off"` |
| `panose-1=(symbol)`| (initial, warning)| `<null>` |
| `panose-1=(function)`| (initial, warning)| `<null>` |
| `panose-1=(null)`| (initial, warning)| `<null>` |
| `panose-1=(undefined)`| (initial, warning)| `<null>` |

## `panose1` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `panose1=(string)`| (initial)| `<null>` |
| `panose1=(empty string)`| (initial)| `<null>` |
| `panose1=(array with string)`| (initial)| `<null>` |
| `panose1=(empty array)`| (initial)| `<null>` |
| `panose1=(object)`| (initial)| `<null>` |
| `panose1=(numeric string)`| (initial)| `<null>` |
| `panose1=(-1)`| (initial)| `<null>` |
| `panose1=(0)`| (initial)| `<null>` |
| `panose1=(integer)`| (initial)| `<null>` |
| `panose1=(NaN)`| (initial, warning)| `<null>` |
| `panose1=(float)`| (initial)| `<null>` |
| `panose1=(true)`| (initial, warning)| `<null>` |
| `panose1=(false)`| (initial, warning)| `<null>` |
| `panose1=(string 'true')`| (initial)| `<null>` |
| `panose1=(string 'false')`| (initial)| `<null>` |
| `panose1=(string 'on')`| (initial)| `<null>` |
| `panose1=(string 'off')`| (initial)| `<null>` |
| `panose1=(symbol)`| (initial, warning)| `<null>` |
| `panose1=(function)`| (initial, warning)| `<null>` |
| `panose1=(null)`| (initial)| `<null>` |
| `panose1=(undefined)`| (initial)| `<null>` |

## `pathLength` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `pathLength=(string)`| (initial)| `<number: 0>` |
| `pathLength=(empty string)`| (initial)| `<number: 0>` |
| `pathLength=(array with string)`| (initial)| `<number: 0>` |
| `pathLength=(empty array)`| (initial)| `<number: 0>` |
| `pathLength=(object)`| (initial)| `<number: 0>` |
| `pathLength=(numeric string)`| (changed)| `<number: 42>` |
| `pathLength=(-1)`| (changed)| `<number: -1>` |
| `pathLength=(0)`| (initial)| `<number: 0>` |
| `pathLength=(integer)`| (changed)| `<number: 1>` |
| `pathLength=(NaN)`| (initial, warning)| `<number: 0>` |
| `pathLength=(float)`| (changed)| `<number: 99.98999786376953>` |
| `pathLength=(true)`| (initial, warning)| `<number: 0>` |
| `pathLength=(false)`| (initial, warning)| `<number: 0>` |
| `pathLength=(string 'true')`| (initial)| `<number: 0>` |
| `pathLength=(string 'false')`| (initial)| `<number: 0>` |
| `pathLength=(string 'on')`| (initial)| `<number: 0>` |
| `pathLength=(string 'off')`| (initial)| `<number: 0>` |
| `pathLength=(symbol)`| (initial, warning)| `<number: 0>` |
| `pathLength=(function)`| (initial, warning)| `<number: 0>` |
| `pathLength=(null)`| (initial)| `<number: 0>` |
| `pathLength=(undefined)`| (initial)| `<number: 0>` |

## `pattern` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `pattern=(string)`| (changed)| `"a string"` |
| `pattern=(empty string)`| (initial)| `<empty string>` |
| `pattern=(array with string)`| (changed)| `"string"` |
| `pattern=(empty array)`| (initial)| `<empty string>` |
| `pattern=(object)`| (changed)| `"result of toString()"` |
| `pattern=(numeric string)`| (changed)| `"42"` |
| `pattern=(-1)`| (changed)| `"-1"` |
| `pattern=(0)`| (changed)| `"0"` |
| `pattern=(integer)`| (changed)| `"1"` |
| `pattern=(NaN)`| (changed, warning)| `"NaN"` |
| `pattern=(float)`| (changed)| `"99.99"` |
| `pattern=(true)`| (initial, warning)| `<empty string>` |
| `pattern=(false)`| (initial, warning)| `<empty string>` |
| `pattern=(string 'true')`| (changed)| `"true"` |
| `pattern=(string 'false')`| (changed)| `"false"` |
| `pattern=(string 'on')`| (changed)| `"on"` |
| `pattern=(string 'off')`| (changed)| `"off"` |
| `pattern=(symbol)`| (initial, warning)| `<empty string>` |
| `pattern=(function)`| (initial, warning)| `<empty string>` |
| `pattern=(null)`| (initial)| `<empty string>` |
| `pattern=(undefined)`| (initial)| `<empty string>` |

## `patternContentUnits` (on `<pattern>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `patternContentUnits=(string)`| (changed)| `<number: 2>` |
| `patternContentUnits=(empty string)`| (initial)| `<number: 1>` |
| `patternContentUnits=(array with string)`| (changed)| `<number: 2>` |
| `patternContentUnits=(empty array)`| (initial)| `<number: 1>` |
| `patternContentUnits=(object)`| (initial)| `<number: 1>` |
| `patternContentUnits=(numeric string)`| (initial)| `<number: 1>` |
| `patternContentUnits=(-1)`| (initial)| `<number: 1>` |
| `patternContentUnits=(0)`| (initial)| `<number: 1>` |
| `patternContentUnits=(integer)`| (initial)| `<number: 1>` |
| `patternContentUnits=(NaN)`| (initial, warning)| `<number: 1>` |
| `patternContentUnits=(float)`| (initial)| `<number: 1>` |
| `patternContentUnits=(true)`| (initial, warning)| `<number: 1>` |
| `patternContentUnits=(false)`| (initial, warning)| `<number: 1>` |
| `patternContentUnits=(string 'true')`| (initial)| `<number: 1>` |
| `patternContentUnits=(string 'false')`| (initial)| `<number: 1>` |
| `patternContentUnits=(string 'on')`| (initial)| `<number: 1>` |
| `patternContentUnits=(string 'off')`| (initial)| `<number: 1>` |
| `patternContentUnits=(symbol)`| (initial, warning)| `<number: 1>` |
| `patternContentUnits=(function)`| (initial, warning)| `<number: 1>` |
| `patternContentUnits=(null)`| (initial)| `<number: 1>` |
| `patternContentUnits=(undefined)`| (initial)| `<number: 1>` |

## `patternTransform` (on `<pattern>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `patternTransform=(string)`| (changed)| `[<SVGMatrix 1 0 0 1 -10 -20>/2/0, <SVGMatrix 2 0 0 2 0 0>/3/0, <SVGMatrix 0.7071067811865476 0.7071067811865475 -0.7071067811865475 0.7071067811865476 0 0>/4/45, <SVGMatrix 1 0 0 1 5 10>/2/0]` |
| `patternTransform=(empty string)`| (initial)| `[]` |
| `patternTransform=(array with string)`| (changed)| `[<SVGMatrix 1 0 0 1 -10 -20>/2/0, <SVGMatrix 2 0 0 2 0 0>/3/0, <SVGMatrix 0.7071067811865476 0.7071067811865475 -0.7071067811865475 0.7071067811865476 0 0>/4/45, <SVGMatrix 1 0 0 1 5 10>/2/0]` |
| `patternTransform=(empty array)`| (initial)| `[]` |
| `patternTransform=(object)`| (initial)| `[]` |
| `patternTransform=(numeric string)`| (initial)| `[]` |
| `patternTransform=(-1)`| (initial)| `[]` |
| `patternTransform=(0)`| (initial)| `[]` |
| `patternTransform=(integer)`| (initial)| `[]` |
| `patternTransform=(NaN)`| (initial, warning)| `[]` |
| `patternTransform=(float)`| (initial)| `[]` |
| `patternTransform=(true)`| (initial, warning)| `[]` |
| `patternTransform=(false)`| (initial, warning)| `[]` |
| `patternTransform=(string 'true')`| (initial)| `[]` |
| `patternTransform=(string 'false')`| (initial)| `[]` |
| `patternTransform=(string 'on')`| (initial)| `[]` |
| `patternTransform=(string 'off')`| (initial)| `[]` |
| `patternTransform=(symbol)`| (initial, warning)| `[]` |
| `patternTransform=(function)`| (initial, warning)| `[]` |
| `patternTransform=(null)`| (initial)| `[]` |
| `patternTransform=(undefined)`| (initial)| `[]` |

## `patternUnits` (on `<pattern>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `patternUnits=(string)`| (changed)| `<number: 1>` |
| `patternUnits=(empty string)`| (initial)| `<number: 2>` |
| `patternUnits=(array with string)`| (changed)| `<number: 1>` |
| `patternUnits=(empty array)`| (initial)| `<number: 2>` |
| `patternUnits=(object)`| (initial)| `<number: 2>` |
| `patternUnits=(numeric string)`| (initial)| `<number: 2>` |
| `patternUnits=(-1)`| (initial)| `<number: 2>` |
| `patternUnits=(0)`| (initial)| `<number: 2>` |
| `patternUnits=(integer)`| (initial)| `<number: 2>` |
| `patternUnits=(NaN)`| (initial, warning)| `<number: 2>` |
| `patternUnits=(float)`| (initial)| `<number: 2>` |
| `patternUnits=(true)`| (initial, warning)| `<number: 2>` |
| `patternUnits=(false)`| (initial, warning)| `<number: 2>` |
| `patternUnits=(string 'true')`| (initial)| `<number: 2>` |
| `patternUnits=(string 'false')`| (initial)| `<number: 2>` |
| `patternUnits=(string 'on')`| (initial)| `<number: 2>` |
| `patternUnits=(string 'off')`| (initial)| `<number: 2>` |
| `patternUnits=(symbol)`| (initial, warning)| `<number: 2>` |
| `patternUnits=(function)`| (initial, warning)| `<number: 2>` |
| `patternUnits=(null)`| (initial)| `<number: 2>` |
| `patternUnits=(undefined)`| (initial)| `<number: 2>` |

## `placeholder` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `placeholder=(string)`| (changed)| `"a string"` |
| `placeholder=(empty string)`| (initial)| `<empty string>` |
| `placeholder=(array with string)`| (changed)| `"string"` |
| `placeholder=(empty array)`| (initial)| `<empty string>` |
| `placeholder=(object)`| (changed)| `"result of toString()"` |
| `placeholder=(numeric string)`| (changed)| `"42"` |
| `placeholder=(-1)`| (changed)| `"-1"` |
| `placeholder=(0)`| (changed)| `"0"` |
| `placeholder=(integer)`| (changed)| `"1"` |
| `placeholder=(NaN)`| (changed, warning)| `"NaN"` |
| `placeholder=(float)`| (changed)| `"99.99"` |
| `placeholder=(true)`| (initial, warning)| `<empty string>` |
| `placeholder=(false)`| (initial, warning)| `<empty string>` |
| `placeholder=(string 'true')`| (changed)| `"true"` |
| `placeholder=(string 'false')`| (changed)| `"false"` |
| `placeholder=(string 'on')`| (changed)| `"on"` |
| `placeholder=(string 'off')`| (changed)| `"off"` |
| `placeholder=(symbol)`| (initial, warning)| `<empty string>` |
| `placeholder=(function)`| (initial, warning)| `<empty string>` |
| `placeholder=(null)`| (initial)| `<empty string>` |
| `placeholder=(undefined)`| (initial)| `<empty string>` |

## `playsInline` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `playsInline=(string)`| (changed)| `<empty string>` |
| `playsInline=(empty string)`| (initial)| `<null>` |
| `playsInline=(array with string)`| (changed)| `<empty string>` |
| `playsInline=(empty array)`| (changed)| `<empty string>` |
| `playsInline=(object)`| (changed)| `<empty string>` |
| `playsInline=(numeric string)`| (changed)| `<empty string>` |
| `playsInline=(-1)`| (changed)| `<empty string>` |
| `playsInline=(0)`| (initial)| `<null>` |
| `playsInline=(integer)`| (changed)| `<empty string>` |
| `playsInline=(NaN)`| (initial, warning)| `<null>` |
| `playsInline=(float)`| (changed)| `<empty string>` |
| `playsInline=(true)`| (changed)| `<empty string>` |
| `playsInline=(false)`| (initial)| `<null>` |
| `playsInline=(string 'true')`| (changed, warning)| `<empty string>` |
| `playsInline=(string 'false')`| (changed, warning)| `<empty string>` |
| `playsInline=(string 'on')`| (changed)| `<empty string>` |
| `playsInline=(string 'off')`| (changed)| `<empty string>` |
| `playsInline=(symbol)`| (initial, warning)| `<null>` |
| `playsInline=(function)`| (initial, warning)| `<null>` |
| `playsInline=(null)`| (initial)| `<null>` |
| `playsInline=(undefined)`| (initial)| `<null>` |

## `pointer-events` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `pointer-events=(string)`| (changed, warning)| `"a string"` |
| `pointer-events=(empty string)`| (changed, warning)| `<empty string>` |
| `pointer-events=(array with string)`| (changed, warning)| `"string"` |
| `pointer-events=(empty array)`| (changed, warning)| `<empty string>` |
| `pointer-events=(object)`| (changed, warning)| `"result of toString()"` |
| `pointer-events=(numeric string)`| (changed, warning)| `"42"` |
| `pointer-events=(-1)`| (changed, warning)| `"-1"` |
| `pointer-events=(0)`| (changed, warning)| `"0"` |
| `pointer-events=(integer)`| (changed, warning)| `"1"` |
| `pointer-events=(NaN)`| (changed, warning)| `"NaN"` |
| `pointer-events=(float)`| (changed, warning)| `"99.99"` |
| `pointer-events=(true)`| (initial, warning)| `<null>` |
| `pointer-events=(false)`| (initial, warning)| `<null>` |
| `pointer-events=(string 'true')`| (changed, warning)| `"true"` |
| `pointer-events=(string 'false')`| (changed, warning)| `"false"` |
| `pointer-events=(string 'on')`| (changed, warning)| `"on"` |
| `pointer-events=(string 'off')`| (changed, warning)| `"off"` |
| `pointer-events=(symbol)`| (initial, warning)| `<null>` |
| `pointer-events=(function)`| (initial, warning)| `<null>` |
| `pointer-events=(null)`| (initial, warning)| `<null>` |
| `pointer-events=(undefined)`| (initial, warning)| `<null>` |

## `pointerEvents` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `pointerEvents=(string)`| (changed)| `"a string"` |
| `pointerEvents=(empty string)`| (changed)| `<empty string>` |
| `pointerEvents=(array with string)`| (changed)| `"string"` |
| `pointerEvents=(empty array)`| (changed)| `<empty string>` |
| `pointerEvents=(object)`| (changed)| `"result of toString()"` |
| `pointerEvents=(numeric string)`| (changed)| `"42"` |
| `pointerEvents=(-1)`| (changed)| `"-1"` |
| `pointerEvents=(0)`| (changed)| `"0"` |
| `pointerEvents=(integer)`| (changed)| `"1"` |
| `pointerEvents=(NaN)`| (changed, warning)| `"NaN"` |
| `pointerEvents=(float)`| (changed)| `"99.99"` |
| `pointerEvents=(true)`| (initial, warning)| `<null>` |
| `pointerEvents=(false)`| (initial, warning)| `<null>` |
| `pointerEvents=(string 'true')`| (changed)| `"true"` |
| `pointerEvents=(string 'false')`| (changed)| `"false"` |
| `pointerEvents=(string 'on')`| (changed)| `"on"` |
| `pointerEvents=(string 'off')`| (changed)| `"off"` |
| `pointerEvents=(symbol)`| (initial, warning)| `<null>` |
| `pointerEvents=(function)`| (initial, warning)| `<null>` |
| `pointerEvents=(null)`| (initial)| `<null>` |
| `pointerEvents=(undefined)`| (initial)| `<null>` |

## `points` (on `<polygon>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `points=(string)`| (changed)| `[<SVGPoint>, <SVGPoint>, <SVGPoint>]` |
| `points=(empty string)`| (initial)| `[]` |
| `points=(array with string)`| (changed)| `[<SVGPoint>, <SVGPoint>, <SVGPoint>]` |
| `points=(empty array)`| (initial)| `[]` |
| `points=(object)`| (initial)| `[]` |
| `points=(numeric string)`| (initial)| `[]` |
| `points=(-1)`| (initial)| `[]` |
| `points=(0)`| (initial)| `[]` |
| `points=(integer)`| (initial)| `[]` |
| `points=(NaN)`| (initial, warning)| `[]` |
| `points=(float)`| (initial)| `[]` |
| `points=(true)`| (initial, warning)| `[]` |
| `points=(false)`| (initial, warning)| `[]` |
| `points=(string 'true')`| (initial)| `[]` |
| `points=(string 'false')`| (initial)| `[]` |
| `points=(string 'on')`| (initial)| `[]` |
| `points=(string 'off')`| (initial)| `[]` |
| `points=(symbol)`| (initial, warning)| `[]` |
| `points=(function)`| (initial, warning)| `[]` |
| `points=(null)`| (initial)| `[]` |
| `points=(undefined)`| (initial)| `[]` |

## `pointsAtX` (on `<feSpotLight>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `pointsAtX=(string)`| (initial)| `<number: 0>` |
| `pointsAtX=(empty string)`| (initial)| `<number: 0>` |
| `pointsAtX=(array with string)`| (initial)| `<number: 0>` |
| `pointsAtX=(empty array)`| (initial)| `<number: 0>` |
| `pointsAtX=(object)`| (initial)| `<number: 0>` |
| `pointsAtX=(numeric string)`| (changed)| `<number: 42>` |
| `pointsAtX=(-1)`| (changed)| `<number: -1>` |
| `pointsAtX=(0)`| (initial)| `<number: 0>` |
| `pointsAtX=(integer)`| (changed)| `<number: 1>` |
| `pointsAtX=(NaN)`| (initial, warning)| `<number: 0>` |
| `pointsAtX=(float)`| (changed)| `<number: 99.98999786376953>` |
| `pointsAtX=(true)`| (initial, warning)| `<number: 0>` |
| `pointsAtX=(false)`| (initial, warning)| `<number: 0>` |
| `pointsAtX=(string 'true')`| (initial)| `<number: 0>` |
| `pointsAtX=(string 'false')`| (initial)| `<number: 0>` |
| `pointsAtX=(string 'on')`| (initial)| `<number: 0>` |
| `pointsAtX=(string 'off')`| (initial)| `<number: 0>` |
| `pointsAtX=(symbol)`| (initial, warning)| `<number: 0>` |
| `pointsAtX=(function)`| (initial, warning)| `<number: 0>` |
| `pointsAtX=(null)`| (initial)| `<number: 0>` |
| `pointsAtX=(undefined)`| (initial)| `<number: 0>` |

## `pointsAtY` (on `<feSpotLight>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `pointsAtY=(string)`| (initial)| `<number: 0>` |
| `pointsAtY=(empty string)`| (initial)| `<number: 0>` |
| `pointsAtY=(array with string)`| (initial)| `<number: 0>` |
| `pointsAtY=(empty array)`| (initial)| `<number: 0>` |
| `pointsAtY=(object)`| (initial)| `<number: 0>` |
| `pointsAtY=(numeric string)`| (changed)| `<number: 42>` |
| `pointsAtY=(-1)`| (changed)| `<number: -1>` |
| `pointsAtY=(0)`| (initial)| `<number: 0>` |
| `pointsAtY=(integer)`| (changed)| `<number: 1>` |
| `pointsAtY=(NaN)`| (initial, warning)| `<number: 0>` |
| `pointsAtY=(float)`| (changed)| `<number: 99.98999786376953>` |
| `pointsAtY=(true)`| (initial, warning)| `<number: 0>` |
| `pointsAtY=(false)`| (initial, warning)| `<number: 0>` |
| `pointsAtY=(string 'true')`| (initial)| `<number: 0>` |
| `pointsAtY=(string 'false')`| (initial)| `<number: 0>` |
| `pointsAtY=(string 'on')`| (initial)| `<number: 0>` |
| `pointsAtY=(string 'off')`| (initial)| `<number: 0>` |
| `pointsAtY=(symbol)`| (initial, warning)| `<number: 0>` |
| `pointsAtY=(function)`| (initial, warning)| `<number: 0>` |
| `pointsAtY=(null)`| (initial)| `<number: 0>` |
| `pointsAtY=(undefined)`| (initial)| `<number: 0>` |

## `pointsAtZ` (on `<feSpotLight>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `pointsAtZ=(string)`| (initial)| `<number: 0>` |
| `pointsAtZ=(empty string)`| (initial)| `<number: 0>` |
| `pointsAtZ=(array with string)`| (initial)| `<number: 0>` |
| `pointsAtZ=(empty array)`| (initial)| `<number: 0>` |
| `pointsAtZ=(object)`| (initial)| `<number: 0>` |
| `pointsAtZ=(numeric string)`| (changed)| `<number: 42>` |
| `pointsAtZ=(-1)`| (changed)| `<number: -1>` |
| `pointsAtZ=(0)`| (initial)| `<number: 0>` |
| `pointsAtZ=(integer)`| (changed)| `<number: 1>` |
| `pointsAtZ=(NaN)`| (initial, warning)| `<number: 0>` |
| `pointsAtZ=(float)`| (changed)| `<number: 99.98999786376953>` |
| `pointsAtZ=(true)`| (initial, warning)| `<number: 0>` |
| `pointsAtZ=(false)`| (initial, warning)| `<number: 0>` |
| `pointsAtZ=(string 'true')`| (initial)| `<number: 0>` |
| `pointsAtZ=(string 'false')`| (initial)| `<number: 0>` |
| `pointsAtZ=(string 'on')`| (initial)| `<number: 0>` |
| `pointsAtZ=(string 'off')`| (initial)| `<number: 0>` |
| `pointsAtZ=(symbol)`| (initial, warning)| `<number: 0>` |
| `pointsAtZ=(function)`| (initial, warning)| `<number: 0>` |
| `pointsAtZ=(null)`| (initial)| `<number: 0>` |
| `pointsAtZ=(undefined)`| (initial)| `<number: 0>` |

## `popover` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `popover=(string)`| (changed)| `"manual"` |
| `popover=(empty string)`| (changed)| `"auto"` |
| `popover=(array with string)`| (changed)| `"manual"` |
| `popover=(empty array)`| (changed)| `"auto"` |
| `popover=(object)`| (changed)| `"manual"` |
| `popover=(numeric string)`| (changed)| `"manual"` |
| `popover=(-1)`| (changed)| `"manual"` |
| `popover=(0)`| (changed)| `"manual"` |
| `popover=(integer)`| (changed)| `"manual"` |
| `popover=(NaN)`| (changed, warning)| `"manual"` |
| `popover=(float)`| (changed)| `"manual"` |
| `popover=(true)`| (initial, warning)| `<null>` |
| `popover=(false)`| (initial, warning)| `<null>` |
| `popover=(string 'true')`| (changed)| `"manual"` |
| `popover=(string 'false')`| (changed)| `"manual"` |
| `popover=(string 'on')`| (changed)| `"manual"` |
| `popover=(string 'off')`| (changed)| `"manual"` |
| `popover=(symbol)`| (initial, warning)| `<null>` |
| `popover=(function)`| (initial, warning)| `<null>` |
| `popover=(null)`| (initial)| `<null>` |
| `popover=(undefined)`| (initial)| `<null>` |

## `popoverTarget` (on `<button>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `popoverTarget=(string)`| (changed)| `<HTMLDivElement>` |
| `popoverTarget=(empty string)`| (initial)| `<null>` |
| `popoverTarget=(array with string)`| (changed, warning, ssr warning)| `<HTMLDivElement>` |
| `popoverTarget=(empty array)`| (initial, warning, ssr warning)| `<null>` |
| `popoverTarget=(object)`| (initial, warning, ssr warning)| `<null>` |
| `popoverTarget=(numeric string)`| (initial)| `<null>` |
| `popoverTarget=(-1)`| (initial)| `<null>` |
| `popoverTarget=(0)`| (initial)| `<null>` |
| `popoverTarget=(integer)`| (initial)| `<null>` |
| `popoverTarget=(NaN)`| (initial, warning)| `<null>` |
| `popoverTarget=(float)`| (initial)| `<null>` |
| `popoverTarget=(true)`| (initial, warning)| `<null>` |
| `popoverTarget=(false)`| (initial, warning)| `<null>` |
| `popoverTarget=(string 'true')`| (initial)| `<null>` |
| `popoverTarget=(string 'false')`| (initial)| `<null>` |
| `popoverTarget=(string 'on')`| (initial)| `<null>` |
| `popoverTarget=(string 'off')`| (initial)| `<null>` |
| `popoverTarget=(symbol)`| (initial, warning)| `<null>` |
| `popoverTarget=(function)`| (initial, warning)| `<null>` |
| `popoverTarget=(null)`| (initial)| `<null>` |
| `popoverTarget=(undefined)`| (initial)| `<null>` |

## `popoverTargetAction` (on `<button>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `popoverTargetAction=(string)`| (changed)| `"show"` |
| `popoverTargetAction=(empty string)`| (initial)| `"toggle"` |
| `popoverTargetAction=(array with string)`| (changed)| `"show"` |
| `popoverTargetAction=(empty array)`| (initial)| `"toggle"` |
| `popoverTargetAction=(object)`| (initial)| `"toggle"` |
| `popoverTargetAction=(numeric string)`| (initial)| `"toggle"` |
| `popoverTargetAction=(-1)`| (initial)| `"toggle"` |
| `popoverTargetAction=(0)`| (initial)| `"toggle"` |
| `popoverTargetAction=(integer)`| (initial)| `"toggle"` |
| `popoverTargetAction=(NaN)`| (initial, warning)| `"toggle"` |
| `popoverTargetAction=(float)`| (initial)| `"toggle"` |
| `popoverTargetAction=(true)`| (initial, warning)| `"toggle"` |
| `popoverTargetAction=(false)`| (initial, warning)| `"toggle"` |
| `popoverTargetAction=(string 'true')`| (initial)| `"toggle"` |
| `popoverTargetAction=(string 'false')`| (initial)| `"toggle"` |
| `popoverTargetAction=(string 'on')`| (initial)| `"toggle"` |
| `popoverTargetAction=(string 'off')`| (initial)| `"toggle"` |
| `popoverTargetAction=(symbol)`| (initial, warning)| `"toggle"` |
| `popoverTargetAction=(function)`| (initial, warning)| `"toggle"` |
| `popoverTargetAction=(null)`| (initial)| `"toggle"` |
| `popoverTargetAction=(undefined)`| (initial)| `"toggle"` |

## `poster` (on `<video>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `poster=(string)`| (changed)| `"https://reactjs.com/"` |
| `poster=(empty string)`| (changed)| `"http://localhost:3000/"` |
| `poster=(array with string)`| (changed)| `"https://reactjs.com/"` |
| `poster=(empty array)`| (changed)| `"http://localhost:3000/"` |
| `poster=(object)`| (changed)| `"http://localhost:3000/result%20of%20toString()"` |
| `poster=(numeric string)`| (changed)| `"http://localhost:3000/42"` |
| `poster=(-1)`| (changed)| `"http://localhost:3000/-1"` |
| `poster=(0)`| (changed)| `"http://localhost:3000/0"` |
| `poster=(integer)`| (changed)| `"http://localhost:3000/1"` |
| `poster=(NaN)`| (changed, warning)| `"http://localhost:3000/NaN"` |
| `poster=(float)`| (changed)| `"http://localhost:3000/99.99"` |
| `poster=(true)`| (initial, warning)| `<empty string>` |
| `poster=(false)`| (initial, warning)| `<empty string>` |
| `poster=(string 'true')`| (changed)| `"http://localhost:3000/true"` |
| `poster=(string 'false')`| (changed)| `"http://localhost:3000/false"` |
| `poster=(string 'on')`| (changed)| `"http://localhost:3000/on"` |
| `poster=(string 'off')`| (changed)| `"http://localhost:3000/off"` |
| `poster=(symbol)`| (initial, warning)| `<empty string>` |
| `poster=(function)`| (initial, warning)| `<empty string>` |
| `poster=(null)`| (initial)| `<empty string>` |
| `poster=(undefined)`| (initial)| `<empty string>` |

## `prefix` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `prefix=(string)`| (changed)| `"a string"` |
| `prefix=(empty string)`| (changed)| `<empty string>` |
| `prefix=(array with string)`| (changed)| `"string"` |
| `prefix=(empty array)`| (changed)| `<empty string>` |
| `prefix=(object)`| (changed)| `"result of toString()"` |
| `prefix=(numeric string)`| (changed)| `"42"` |
| `prefix=(-1)`| (changed)| `"-1"` |
| `prefix=(0)`| (changed)| `"0"` |
| `prefix=(integer)`| (changed)| `"1"` |
| `prefix=(NaN)`| (changed, warning)| `"NaN"` |
| `prefix=(float)`| (changed)| `"99.99"` |
| `prefix=(true)`| (initial, warning)| `<null>` |
| `prefix=(false)`| (initial, warning)| `<null>` |
| `prefix=(string 'true')`| (changed)| `"true"` |
| `prefix=(string 'false')`| (changed)| `"false"` |
| `prefix=(string 'on')`| (changed)| `"on"` |
| `prefix=(string 'off')`| (changed)| `"off"` |
| `prefix=(symbol)`| (initial, warning)| `<null>` |
| `prefix=(function)`| (initial, warning)| `<null>` |
| `prefix=(null)`| (initial)| `<null>` |
| `prefix=(undefined)`| (initial)| `<null>` |

## `preload` (on `<video>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `preload=(string)`| (changed)| `"none"` |
| `preload=(empty string)`| (changed)| `"auto"` |
| `preload=(array with string)`| (changed)| `"none"` |
| `preload=(empty array)`| (changed)| `"auto"` |
| `preload=(object)`| (initial)| `"metadata"` |
| `preload=(numeric string)`| (initial)| `"metadata"` |
| `preload=(-1)`| (initial)| `"metadata"` |
| `preload=(0)`| (initial)| `"metadata"` |
| `preload=(integer)`| (initial)| `"metadata"` |
| `preload=(NaN)`| (initial, warning)| `"metadata"` |
| `preload=(float)`| (initial)| `"metadata"` |
| `preload=(true)`| (initial, warning)| `"metadata"` |
| `preload=(false)`| (initial, warning)| `"metadata"` |
| `preload=(string 'true')`| (initial)| `"metadata"` |
| `preload=(string 'false')`| (initial)| `"metadata"` |
| `preload=(string 'on')`| (initial)| `"metadata"` |
| `preload=(string 'off')`| (initial)| `"metadata"` |
| `preload=(symbol)`| (initial, warning)| `"metadata"` |
| `preload=(function)`| (initial, warning)| `"metadata"` |
| `preload=(null)`| (initial)| `"metadata"` |
| `preload=(undefined)`| (initial)| `"metadata"` |

## `preserveAlpha` (on `<feConvolveMatrix>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `preserveAlpha=(string)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(empty string)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(array with string)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(empty array)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(object)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(numeric string)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(-1)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(0)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(integer)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(NaN)`| (initial, warning)| `<boolean: false>` |
| `preserveAlpha=(float)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(true)`| (changed)| `<boolean: true>` |
| `preserveAlpha=(false)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(string 'true')`| (changed)| `<boolean: true>` |
| `preserveAlpha=(string 'false')`| (initial)| `<boolean: false>` |
| `preserveAlpha=(string 'on')`| (initial)| `<boolean: false>` |
| `preserveAlpha=(string 'off')`| (initial)| `<boolean: false>` |
| `preserveAlpha=(symbol)`| (initial, warning)| `<boolean: false>` |
| `preserveAlpha=(function)`| (initial, warning)| `<boolean: false>` |
| `preserveAlpha=(null)`| (initial)| `<boolean: false>` |
| `preserveAlpha=(undefined)`| (initial)| `<boolean: false>` |

## `preserveAspectRatio` (on `<feImage>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `preserveAspectRatio=(string)`| (changed)| `<SVGPreserveAspectRatio: 2/2>` |
| `preserveAspectRatio=(empty string)`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(array with string)`| (changed)| `<SVGPreserveAspectRatio: 2/2>` |
| `preserveAspectRatio=(empty array)`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(object)`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(numeric string)`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(-1)`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(0)`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(integer)`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(NaN)`| (initial, warning)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(float)`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(true)`| (initial, warning)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(false)`| (initial, warning)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(string 'true')`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(string 'false')`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(string 'on')`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(string 'off')`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(symbol)`| (initial, warning)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(function)`| (initial, warning)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(null)`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |
| `preserveAspectRatio=(undefined)`| (initial)| `<SVGPreserveAspectRatio: 6/1>` |

## `primitiveUnits` (on `<filter>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `primitiveUnits=(string)`| (changed)| `<number: 2>` |
| `primitiveUnits=(empty string)`| (initial)| `<number: 1>` |
| `primitiveUnits=(array with string)`| (changed)| `<number: 2>` |
| `primitiveUnits=(empty array)`| (initial)| `<number: 1>` |
| `primitiveUnits=(object)`| (initial)| `<number: 1>` |
| `primitiveUnits=(numeric string)`| (initial)| `<number: 1>` |
| `primitiveUnits=(-1)`| (initial)| `<number: 1>` |
| `primitiveUnits=(0)`| (initial)| `<number: 1>` |
| `primitiveUnits=(integer)`| (initial)| `<number: 1>` |
| `primitiveUnits=(NaN)`| (initial, warning)| `<number: 1>` |
| `primitiveUnits=(float)`| (initial)| `<number: 1>` |
| `primitiveUnits=(true)`| (initial, warning)| `<number: 1>` |
| `primitiveUnits=(false)`| (initial, warning)| `<number: 1>` |
| `primitiveUnits=(string 'true')`| (initial)| `<number: 1>` |
| `primitiveUnits=(string 'false')`| (initial)| `<number: 1>` |
| `primitiveUnits=(string 'on')`| (initial)| `<number: 1>` |
| `primitiveUnits=(string 'off')`| (initial)| `<number: 1>` |
| `primitiveUnits=(symbol)`| (initial, warning)| `<number: 1>` |
| `primitiveUnits=(function)`| (initial, warning)| `<number: 1>` |
| `primitiveUnits=(null)`| (initial)| `<number: 1>` |
| `primitiveUnits=(undefined)`| (initial)| `<number: 1>` |

## `profile` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `profile=(string)`| (changed)| `"a string"` |
| `profile=(empty string)`| (changed)| `<empty string>` |
| `profile=(array with string)`| (changed)| `"string"` |
| `profile=(empty array)`| (changed)| `<empty string>` |
| `profile=(object)`| (changed)| `"result of toString()"` |
| `profile=(numeric string)`| (changed)| `"42"` |
| `profile=(-1)`| (changed)| `"-1"` |
| `profile=(0)`| (changed)| `"0"` |
| `profile=(integer)`| (changed)| `"1"` |
| `profile=(NaN)`| (changed, warning)| `"NaN"` |
| `profile=(float)`| (changed)| `"99.99"` |
| `profile=(true)`| (initial, warning)| `<null>` |
| `profile=(false)`| (initial, warning)| `<null>` |
| `profile=(string 'true')`| (changed)| `"true"` |
| `profile=(string 'false')`| (changed)| `"false"` |
| `profile=(string 'on')`| (changed)| `"on"` |
| `profile=(string 'off')`| (changed)| `"off"` |
| `profile=(symbol)`| (initial, warning)| `<null>` |
| `profile=(function)`| (initial, warning)| `<null>` |
| `profile=(null)`| (initial)| `<null>` |
| `profile=(undefined)`| (initial)| `<null>` |

## `property` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `property=(string)`| (changed)| `"a string"` |
| `property=(empty string)`| (changed)| `<empty string>` |
| `property=(array with string)`| (changed)| `"string"` |
| `property=(empty array)`| (changed)| `<empty string>` |
| `property=(object)`| (changed)| `"result of toString()"` |
| `property=(numeric string)`| (changed)| `"42"` |
| `property=(-1)`| (changed)| `"-1"` |
| `property=(0)`| (changed)| `"0"` |
| `property=(integer)`| (changed)| `"1"` |
| `property=(NaN)`| (changed, warning)| `"NaN"` |
| `property=(float)`| (changed)| `"99.99"` |
| `property=(true)`| (initial, warning)| `<null>` |
| `property=(false)`| (initial, warning)| `<null>` |
| `property=(string 'true')`| (changed)| `"true"` |
| `property=(string 'false')`| (changed)| `"false"` |
| `property=(string 'on')`| (changed)| `"on"` |
| `property=(string 'off')`| (changed)| `"off"` |
| `property=(symbol)`| (initial, warning)| `<null>` |
| `property=(function)`| (initial, warning)| `<null>` |
| `property=(null)`| (initial)| `<null>` |
| `property=(undefined)`| (initial)| `<null>` |

## `props` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `props=(string)`| (changed)| `"a string"` |
| `props=(empty string)`| (changed)| `<empty string>` |
| `props=(array with string)`| (changed)| `"string"` |
| `props=(empty array)`| (changed)| `<empty string>` |
| `props=(object)`| (changed)| `"result of toString()"` |
| `props=(numeric string)`| (changed)| `"42"` |
| `props=(-1)`| (changed)| `"-1"` |
| `props=(0)`| (changed)| `"0"` |
| `props=(integer)`| (changed)| `"1"` |
| `props=(NaN)`| (changed, warning)| `"NaN"` |
| `props=(float)`| (changed)| `"99.99"` |
| `props=(true)`| (initial, warning)| `<null>` |
| `props=(false)`| (initial, warning)| `<null>` |
| `props=(string 'true')`| (changed)| `"true"` |
| `props=(string 'false')`| (changed)| `"false"` |
| `props=(string 'on')`| (changed)| `"on"` |
| `props=(string 'off')`| (changed)| `"off"` |
| `props=(symbol)`| (initial, warning)| `<null>` |
| `props=(function)`| (initial, warning)| `<null>` |
| `props=(null)`| (initial)| `<null>` |
| `props=(undefined)`| (initial)| `<null>` |

## `r` (on `<circle>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `r=(string)`| (changed)| `<SVGLength: 10pt>` |
| `r=(empty string)`| (initial)| `<SVGLength: 0>` |
| `r=(array with string)`| (changed)| `<SVGLength: 10pt>` |
| `r=(empty array)`| (initial)| `<SVGLength: 0>` |
| `r=(object)`| (initial)| `<SVGLength: 0>` |
| `r=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `r=(-1)`| (changed)| `<SVGLength: -1>` |
| `r=(0)`| (initial)| `<SVGLength: 0>` |
| `r=(integer)`| (changed)| `<SVGLength: 1>` |
| `r=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `r=(float)`| (changed)| `<SVGLength: 99.99>` |
| `r=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `r=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `r=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `r=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `r=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `r=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `r=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `r=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `r=(null)`| (initial)| `<SVGLength: 0>` |
| `r=(undefined)`| (initial)| `<SVGLength: 0>` |

## `radioGroup` (on `<command>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `radioGroup=(string)`| (changed)| `"a string"` |
| `radioGroup=(empty string)`| (changed)| `<empty string>` |
| `radioGroup=(array with string)`| (changed)| `"string"` |
| `radioGroup=(empty array)`| (changed)| `<empty string>` |
| `radioGroup=(object)`| (changed)| `"result of toString()"` |
| `radioGroup=(numeric string)`| (changed)| `"42"` |
| `radioGroup=(-1)`| (changed)| `"-1"` |
| `radioGroup=(0)`| (changed)| `"0"` |
| `radioGroup=(integer)`| (changed)| `"1"` |
| `radioGroup=(NaN)`| (changed, warning)| `"NaN"` |
| `radioGroup=(float)`| (changed)| `"99.99"` |
| `radioGroup=(true)`| (initial, warning)| `<null>` |
| `radioGroup=(false)`| (initial, warning)| `<null>` |
| `radioGroup=(string 'true')`| (changed)| `"true"` |
| `radioGroup=(string 'false')`| (changed)| `"false"` |
| `radioGroup=(string 'on')`| (changed)| `"on"` |
| `radioGroup=(string 'off')`| (changed)| `"off"` |
| `radioGroup=(symbol)`| (initial, warning)| `<null>` |
| `radioGroup=(function)`| (initial, warning)| `<null>` |
| `radioGroup=(null)`| (initial)| `<null>` |
| `radioGroup=(undefined)`| (initial)| `<null>` |

## `radius` (on `<feMorphology>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `radius=(string)`| (changed)| `"a string"` |
| `radius=(empty string)`| (changed)| `<empty string>` |
| `radius=(array with string)`| (changed)| `"string"` |
| `radius=(empty array)`| (changed)| `<empty string>` |
| `radius=(object)`| (changed)| `"result of toString()"` |
| `radius=(numeric string)`| (changed)| `"42"` |
| `radius=(-1)`| (changed)| `"-1"` |
| `radius=(0)`| (changed)| `"0"` |
| `radius=(integer)`| (changed)| `"1"` |
| `radius=(NaN)`| (changed, warning)| `"NaN"` |
| `radius=(float)`| (changed)| `"99.99"` |
| `radius=(true)`| (initial, warning)| `<null>` |
| `radius=(false)`| (initial, warning)| `<null>` |
| `radius=(string 'true')`| (changed)| `"true"` |
| `radius=(string 'false')`| (changed)| `"false"` |
| `radius=(string 'on')`| (changed)| `"on"` |
| `radius=(string 'off')`| (changed)| `"off"` |
| `radius=(symbol)`| (initial, warning)| `<null>` |
| `radius=(function)`| (initial, warning)| `<null>` |
| `radius=(null)`| (initial)| `<null>` |
| `radius=(undefined)`| (initial)| `<null>` |

## `readOnly` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `readOnly=(string)`| (changed)| `<boolean: true>` |
| `readOnly=(empty string)`| (initial)| `<boolean: false>` |
| `readOnly=(array with string)`| (changed)| `<boolean: true>` |
| `readOnly=(empty array)`| (changed)| `<boolean: true>` |
| `readOnly=(object)`| (changed)| `<boolean: true>` |
| `readOnly=(numeric string)`| (changed)| `<boolean: true>` |
| `readOnly=(-1)`| (changed)| `<boolean: true>` |
| `readOnly=(0)`| (initial)| `<boolean: false>` |
| `readOnly=(integer)`| (changed)| `<boolean: true>` |
| `readOnly=(NaN)`| (initial, warning)| `<boolean: false>` |
| `readOnly=(float)`| (changed)| `<boolean: true>` |
| `readOnly=(true)`| (changed)| `<boolean: true>` |
| `readOnly=(false)`| (initial)| `<boolean: false>` |
| `readOnly=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `readOnly=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `readOnly=(string 'on')`| (changed)| `<boolean: true>` |
| `readOnly=(string 'off')`| (changed)| `<boolean: true>` |
| `readOnly=(symbol)`| (initial, warning)| `<boolean: false>` |
| `readOnly=(function)`| (initial, warning)| `<boolean: false>` |
| `readOnly=(null)`| (initial)| `<boolean: false>` |
| `readOnly=(undefined)`| (initial)| `<boolean: false>` |

## `referrerPolicy` (on `<iframe>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `referrerPolicy=(string)`| (initial)| `<empty string>` |
| `referrerPolicy=(empty string)`| (initial)| `<empty string>` |
| `referrerPolicy=(array with string)`| (initial)| `<empty string>` |
| `referrerPolicy=(empty array)`| (initial)| `<empty string>` |
| `referrerPolicy=(object)`| (initial)| `<empty string>` |
| `referrerPolicy=(numeric string)`| (initial)| `<empty string>` |
| `referrerPolicy=(-1)`| (initial)| `<empty string>` |
| `referrerPolicy=(0)`| (initial)| `<empty string>` |
| `referrerPolicy=(integer)`| (initial)| `<empty string>` |
| `referrerPolicy=(NaN)`| (initial, warning)| `<empty string>` |
| `referrerPolicy=(float)`| (initial)| `<empty string>` |
| `referrerPolicy=(true)`| (initial, warning)| `<empty string>` |
| `referrerPolicy=(false)`| (initial, warning)| `<empty string>` |
| `referrerPolicy=(string 'true')`| (initial)| `<empty string>` |
| `referrerPolicy=(string 'false')`| (initial)| `<empty string>` |
| `referrerPolicy=(string 'on')`| (initial)| `<empty string>` |
| `referrerPolicy=(string 'off')`| (initial)| `<empty string>` |
| `referrerPolicy=(symbol)`| (initial, warning)| `<empty string>` |
| `referrerPolicy=(function)`| (initial, warning)| `<empty string>` |
| `referrerPolicy=(null)`| (initial)| `<empty string>` |
| `referrerPolicy=(undefined)`| (initial)| `<empty string>` |

## `refX` (on `<marker>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `refX=(string)`| (changed)| `<SVGLength: 5em>` |
| `refX=(empty string)`| (initial)| `<SVGLength: 0>` |
| `refX=(array with string)`| (changed)| `<SVGLength: 5em>` |
| `refX=(empty array)`| (initial)| `<SVGLength: 0>` |
| `refX=(object)`| (initial)| `<SVGLength: 0>` |
| `refX=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `refX=(-1)`| (changed)| `<SVGLength: -1>` |
| `refX=(0)`| (initial)| `<SVGLength: 0>` |
| `refX=(integer)`| (changed)| `<SVGLength: 1>` |
| `refX=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `refX=(float)`| (changed)| `<SVGLength: 99.99>` |
| `refX=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `refX=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `refX=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `refX=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `refX=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `refX=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `refX=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `refX=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `refX=(null)`| (initial)| `<SVGLength: 0>` |
| `refX=(undefined)`| (initial)| `<SVGLength: 0>` |

## `refY` (on `<marker>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `refY=(string)`| (changed)| `<SVGLength: 6em>` |
| `refY=(empty string)`| (initial)| `<SVGLength: 0>` |
| `refY=(array with string)`| (changed)| `<SVGLength: 6em>` |
| `refY=(empty array)`| (initial)| `<SVGLength: 0>` |
| `refY=(object)`| (initial)| `<SVGLength: 0>` |
| `refY=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `refY=(-1)`| (changed)| `<SVGLength: -1>` |
| `refY=(0)`| (initial)| `<SVGLength: 0>` |
| `refY=(integer)`| (changed)| `<SVGLength: 1>` |
| `refY=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `refY=(float)`| (changed)| `<SVGLength: 99.99>` |
| `refY=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `refY=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `refY=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `refY=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `refY=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `refY=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `refY=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `refY=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `refY=(null)`| (initial)| `<SVGLength: 0>` |
| `refY=(undefined)`| (initial)| `<SVGLength: 0>` |

## `rel` (on `<a>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `rel=(string)`| (changed)| `"a string"` |
| `rel=(empty string)`| (initial)| `<empty string>` |
| `rel=(array with string)`| (changed)| `"string"` |
| `rel=(empty array)`| (initial)| `<empty string>` |
| `rel=(object)`| (changed)| `"result of toString()"` |
| `rel=(numeric string)`| (changed)| `"42"` |
| `rel=(-1)`| (changed)| `"-1"` |
| `rel=(0)`| (changed)| `"0"` |
| `rel=(integer)`| (changed)| `"1"` |
| `rel=(NaN)`| (changed, warning)| `"NaN"` |
| `rel=(float)`| (changed)| `"99.99"` |
| `rel=(true)`| (initial, warning)| `<empty string>` |
| `rel=(false)`| (initial, warning)| `<empty string>` |
| `rel=(string 'true')`| (changed)| `"true"` |
| `rel=(string 'false')`| (changed)| `"false"` |
| `rel=(string 'on')`| (changed)| `"on"` |
| `rel=(string 'off')`| (changed)| `"off"` |
| `rel=(symbol)`| (initial, warning)| `<empty string>` |
| `rel=(function)`| (initial, warning)| `<empty string>` |
| `rel=(null)`| (initial)| `<empty string>` |
| `rel=(undefined)`| (initial)| `<empty string>` |

## `rendering-intent` (on `<color-profile>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `rendering-intent=(string)`| (changed, warning)| `"a string"` |
| `rendering-intent=(empty string)`| (changed, warning)| `<empty string>` |
| `rendering-intent=(array with string)`| (changed, warning)| `"string"` |
| `rendering-intent=(empty array)`| (changed, warning)| `<empty string>` |
| `rendering-intent=(object)`| (changed, warning)| `"result of toString()"` |
| `rendering-intent=(numeric string)`| (changed, warning)| `"42"` |
| `rendering-intent=(-1)`| (changed, warning)| `"-1"` |
| `rendering-intent=(0)`| (changed, warning)| `"0"` |
| `rendering-intent=(integer)`| (changed, warning)| `"1"` |
| `rendering-intent=(NaN)`| (changed, warning)| `"NaN"` |
| `rendering-intent=(float)`| (changed, warning)| `"99.99"` |
| `rendering-intent=(true)`| (initial, warning)| `<null>` |
| `rendering-intent=(false)`| (initial, warning)| `<null>` |
| `rendering-intent=(string 'true')`| (changed, warning)| `"true"` |
| `rendering-intent=(string 'false')`| (changed, warning)| `"false"` |
| `rendering-intent=(string 'on')`| (changed, warning)| `"on"` |
| `rendering-intent=(string 'off')`| (changed, warning)| `"off"` |
| `rendering-intent=(symbol)`| (initial, warning)| `<null>` |
| `rendering-intent=(function)`| (initial, warning)| `<null>` |
| `rendering-intent=(null)`| (initial, warning)| `<null>` |
| `rendering-intent=(undefined)`| (initial, warning)| `<null>` |

## `renderingIntent` (on `<color-profile>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `renderingIntent=(string)`| (changed)| `"a string"` |
| `renderingIntent=(empty string)`| (changed)| `<empty string>` |
| `renderingIntent=(array with string)`| (changed)| `"string"` |
| `renderingIntent=(empty array)`| (changed)| `<empty string>` |
| `renderingIntent=(object)`| (changed)| `"result of toString()"` |
| `renderingIntent=(numeric string)`| (changed)| `"42"` |
| `renderingIntent=(-1)`| (changed)| `"-1"` |
| `renderingIntent=(0)`| (changed)| `"0"` |
| `renderingIntent=(integer)`| (changed)| `"1"` |
| `renderingIntent=(NaN)`| (changed, warning)| `"NaN"` |
| `renderingIntent=(float)`| (changed)| `"99.99"` |
| `renderingIntent=(true)`| (initial, warning)| `<null>` |
| `renderingIntent=(false)`| (initial, warning)| `<null>` |
| `renderingIntent=(string 'true')`| (changed)| `"true"` |
| `renderingIntent=(string 'false')`| (changed)| `"false"` |
| `renderingIntent=(string 'on')`| (changed)| `"on"` |
| `renderingIntent=(string 'off')`| (changed)| `"off"` |
| `renderingIntent=(symbol)`| (initial, warning)| `<null>` |
| `renderingIntent=(function)`| (initial, warning)| `<null>` |
| `renderingIntent=(null)`| (initial)| `<null>` |
| `renderingIntent=(undefined)`| (initial)| `<null>` |

## `repeatCount` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `repeatCount=(string)`| (initial)| `<null>` |
| `repeatCount=(empty string)`| (initial)| `<null>` |
| `repeatCount=(array with string)`| (initial)| `<null>` |
| `repeatCount=(empty array)`| (initial)| `<null>` |
| `repeatCount=(object)`| (initial)| `<null>` |
| `repeatCount=(numeric string)`| (initial)| `<null>` |
| `repeatCount=(-1)`| (initial)| `<null>` |
| `repeatCount=(0)`| (initial)| `<null>` |
| `repeatCount=(integer)`| (initial)| `<null>` |
| `repeatCount=(NaN)`| (initial, warning)| `<null>` |
| `repeatCount=(float)`| (initial)| `<null>` |
| `repeatCount=(true)`| (initial, warning)| `<null>` |
| `repeatCount=(false)`| (initial, warning)| `<null>` |
| `repeatCount=(string 'true')`| (initial)| `<null>` |
| `repeatCount=(string 'false')`| (initial)| `<null>` |
| `repeatCount=(string 'on')`| (initial)| `<null>` |
| `repeatCount=(string 'off')`| (initial)| `<null>` |
| `repeatCount=(symbol)`| (initial, warning)| `<null>` |
| `repeatCount=(function)`| (initial, warning)| `<null>` |
| `repeatCount=(null)`| (initial)| `<null>` |
| `repeatCount=(undefined)`| (initial)| `<null>` |

## `repeatDur` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `repeatDur=(string)`| (initial)| `<null>` |
| `repeatDur=(empty string)`| (initial)| `<null>` |
| `repeatDur=(array with string)`| (initial)| `<null>` |
| `repeatDur=(empty array)`| (initial)| `<null>` |
| `repeatDur=(object)`| (initial)| `<null>` |
| `repeatDur=(numeric string)`| (initial)| `<null>` |
| `repeatDur=(-1)`| (initial)| `<null>` |
| `repeatDur=(0)`| (initial)| `<null>` |
| `repeatDur=(integer)`| (initial)| `<null>` |
| `repeatDur=(NaN)`| (initial, warning)| `<null>` |
| `repeatDur=(float)`| (initial)| `<null>` |
| `repeatDur=(true)`| (initial, warning)| `<null>` |
| `repeatDur=(false)`| (initial, warning)| `<null>` |
| `repeatDur=(string 'true')`| (initial)| `<null>` |
| `repeatDur=(string 'false')`| (initial)| `<null>` |
| `repeatDur=(string 'on')`| (initial)| `<null>` |
| `repeatDur=(string 'off')`| (initial)| `<null>` |
| `repeatDur=(symbol)`| (initial, warning)| `<null>` |
| `repeatDur=(function)`| (initial, warning)| `<null>` |
| `repeatDur=(null)`| (initial)| `<null>` |
| `repeatDur=(undefined)`| (initial)| `<null>` |

## `required` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `required=(string)`| (changed)| `<boolean: true>` |
| `required=(empty string)`| (initial)| `<boolean: false>` |
| `required=(array with string)`| (changed)| `<boolean: true>` |
| `required=(empty array)`| (changed)| `<boolean: true>` |
| `required=(object)`| (changed)| `<boolean: true>` |
| `required=(numeric string)`| (changed)| `<boolean: true>` |
| `required=(-1)`| (changed)| `<boolean: true>` |
| `required=(0)`| (initial)| `<boolean: false>` |
| `required=(integer)`| (changed)| `<boolean: true>` |
| `required=(NaN)`| (initial, warning)| `<boolean: false>` |
| `required=(float)`| (changed)| `<boolean: true>` |
| `required=(true)`| (changed)| `<boolean: true>` |
| `required=(false)`| (initial)| `<boolean: false>` |
| `required=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `required=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `required=(string 'on')`| (changed)| `<boolean: true>` |
| `required=(string 'off')`| (changed)| `<boolean: true>` |
| `required=(symbol)`| (initial, warning)| `<boolean: false>` |
| `required=(function)`| (initial, warning)| `<boolean: false>` |
| `required=(null)`| (initial)| `<boolean: false>` |
| `required=(undefined)`| (initial)| `<boolean: false>` |

## `requiredExtensions` (on `<a>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `requiredExtensions=(string)`| (changed)| `["a", "string"]` |
| `requiredExtensions=(empty string)`| (initial)| `[]` |
| `requiredExtensions=(array with string)`| (changed)| `["string"]` |
| `requiredExtensions=(empty array)`| (initial)| `[]` |
| `requiredExtensions=(object)`| (changed)| `["result", "of", "toString()"]` |
| `requiredExtensions=(numeric string)`| (changed)| `["42"]` |
| `requiredExtensions=(-1)`| (changed)| `["-1"]` |
| `requiredExtensions=(0)`| (changed)| `["0"]` |
| `requiredExtensions=(integer)`| (changed)| `["1"]` |
| `requiredExtensions=(NaN)`| (changed, warning)| `["NaN"]` |
| `requiredExtensions=(float)`| (changed)| `["99.99"]` |
| `requiredExtensions=(true)`| (initial, warning)| `[]` |
| `requiredExtensions=(false)`| (initial, warning)| `[]` |
| `requiredExtensions=(string 'true')`| (changed)| `["true"]` |
| `requiredExtensions=(string 'false')`| (changed)| `["false"]` |
| `requiredExtensions=(string 'on')`| (changed)| `["on"]` |
| `requiredExtensions=(string 'off')`| (changed)| `["off"]` |
| `requiredExtensions=(symbol)`| (initial, warning)| `[]` |
| `requiredExtensions=(function)`| (initial, warning)| `[]` |
| `requiredExtensions=(null)`| (initial)| `[]` |
| `requiredExtensions=(undefined)`| (initial)| `[]` |

## `requiredFeatures` (on `<a>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `requiredFeatures=(string)`| (changed)| `"a string"` |
| `requiredFeatures=(empty string)`| (changed)| `<empty string>` |
| `requiredFeatures=(array with string)`| (changed)| `"string"` |
| `requiredFeatures=(empty array)`| (changed)| `<empty string>` |
| `requiredFeatures=(object)`| (changed)| `"result of toString()"` |
| `requiredFeatures=(numeric string)`| (changed)| `"42"` |
| `requiredFeatures=(-1)`| (changed)| `"-1"` |
| `requiredFeatures=(0)`| (changed)| `"0"` |
| `requiredFeatures=(integer)`| (changed)| `"1"` |
| `requiredFeatures=(NaN)`| (changed, warning)| `"NaN"` |
| `requiredFeatures=(float)`| (changed)| `"99.99"` |
| `requiredFeatures=(true)`| (initial, warning)| `<null>` |
| `requiredFeatures=(false)`| (initial, warning)| `<null>` |
| `requiredFeatures=(string 'true')`| (changed)| `"true"` |
| `requiredFeatures=(string 'false')`| (changed)| `"false"` |
| `requiredFeatures=(string 'on')`| (changed)| `"on"` |
| `requiredFeatures=(string 'off')`| (changed)| `"off"` |
| `requiredFeatures=(symbol)`| (initial, warning)| `<null>` |
| `requiredFeatures=(function)`| (initial, warning)| `<null>` |
| `requiredFeatures=(null)`| (initial)| `<null>` |
| `requiredFeatures=(undefined)`| (initial)| `<null>` |

## `resource` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `resource=(string)`| (changed)| `"a string"` |
| `resource=(empty string)`| (changed)| `<empty string>` |
| `resource=(array with string)`| (changed)| `"string"` |
| `resource=(empty array)`| (changed)| `<empty string>` |
| `resource=(object)`| (changed)| `"result of toString()"` |
| `resource=(numeric string)`| (changed)| `"42"` |
| `resource=(-1)`| (changed)| `"-1"` |
| `resource=(0)`| (changed)| `"0"` |
| `resource=(integer)`| (changed)| `"1"` |
| `resource=(NaN)`| (changed, warning)| `"NaN"` |
| `resource=(float)`| (changed)| `"99.99"` |
| `resource=(true)`| (initial, warning)| `<null>` |
| `resource=(false)`| (initial, warning)| `<null>` |
| `resource=(string 'true')`| (changed)| `"true"` |
| `resource=(string 'false')`| (changed)| `"false"` |
| `resource=(string 'on')`| (changed)| `"on"` |
| `resource=(string 'off')`| (changed)| `"off"` |
| `resource=(symbol)`| (initial, warning)| `<null>` |
| `resource=(function)`| (initial, warning)| `<null>` |
| `resource=(null)`| (initial)| `<null>` |
| `resource=(undefined)`| (initial)| `<null>` |

## `restart` (on `<animate>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `restart=(string)`| (initial)| `<null>` |
| `restart=(empty string)`| (initial)| `<null>` |
| `restart=(array with string)`| (initial)| `<null>` |
| `restart=(empty array)`| (initial)| `<null>` |
| `restart=(object)`| (initial)| `<null>` |
| `restart=(numeric string)`| (initial)| `<null>` |
| `restart=(-1)`| (initial)| `<null>` |
| `restart=(0)`| (initial)| `<null>` |
| `restart=(integer)`| (initial)| `<null>` |
| `restart=(NaN)`| (initial, warning)| `<null>` |
| `restart=(float)`| (initial)| `<null>` |
| `restart=(true)`| (initial, warning)| `<null>` |
| `restart=(false)`| (initial, warning)| `<null>` |
| `restart=(string 'true')`| (initial)| `<null>` |
| `restart=(string 'false')`| (initial)| `<null>` |
| `restart=(string 'on')`| (initial)| `<null>` |
| `restart=(string 'off')`| (initial)| `<null>` |
| `restart=(symbol)`| (initial, warning)| `<null>` |
| `restart=(function)`| (initial, warning)| `<null>` |
| `restart=(null)`| (initial)| `<null>` |
| `restart=(undefined)`| (initial)| `<null>` |

## `result` (on `<feBlend>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `result=(string)`| (changed)| `"a string"` |
| `result=(empty string)`| (initial)| `<empty string>` |
| `result=(array with string)`| (changed)| `"string"` |
| `result=(empty array)`| (initial)| `<empty string>` |
| `result=(object)`| (changed)| `"result of toString()"` |
| `result=(numeric string)`| (changed)| `"42"` |
| `result=(-1)`| (changed)| `"-1"` |
| `result=(0)`| (changed)| `"0"` |
| `result=(integer)`| (changed)| `"1"` |
| `result=(NaN)`| (changed, warning)| `"NaN"` |
| `result=(float)`| (changed)| `"99.99"` |
| `result=(true)`| (initial, warning)| `<empty string>` |
| `result=(false)`| (initial, warning)| `<empty string>` |
| `result=(string 'true')`| (changed)| `"true"` |
| `result=(string 'false')`| (changed)| `"false"` |
| `result=(string 'on')`| (changed)| `"on"` |
| `result=(string 'off')`| (changed)| `"off"` |
| `result=(symbol)`| (initial, warning)| `<empty string>` |
| `result=(function)`| (initial, warning)| `<empty string>` |
| `result=(null)`| (initial)| `<empty string>` |
| `result=(undefined)`| (initial)| `<empty string>` |

## `results` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `results=(string)`| (changed)| `"a string"` |
| `results=(empty string)`| (changed)| `<empty string>` |
| `results=(array with string)`| (changed)| `"string"` |
| `results=(empty array)`| (changed)| `<empty string>` |
| `results=(object)`| (changed)| `"result of toString()"` |
| `results=(numeric string)`| (changed)| `"42"` |
| `results=(-1)`| (changed)| `"-1"` |
| `results=(0)`| (changed)| `"0"` |
| `results=(integer)`| (changed)| `"1"` |
| `results=(NaN)`| (changed, warning)| `"NaN"` |
| `results=(float)`| (changed)| `"99.99"` |
| `results=(true)`| (initial, warning)| `<null>` |
| `results=(false)`| (initial, warning)| `<null>` |
| `results=(string 'true')`| (changed)| `"true"` |
| `results=(string 'false')`| (changed)| `"false"` |
| `results=(string 'on')`| (changed)| `"on"` |
| `results=(string 'off')`| (changed)| `"off"` |
| `results=(symbol)`| (initial, warning)| `<null>` |
| `results=(function)`| (initial, warning)| `<null>` |
| `results=(null)`| (initial)| `<null>` |
| `results=(undefined)`| (initial)| `<null>` |

## `reversed` (on `<ol>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `reversed=(string)`| (changed)| `<boolean: true>` |
| `reversed=(empty string)`| (initial)| `<boolean: false>` |
| `reversed=(array with string)`| (changed)| `<boolean: true>` |
| `reversed=(empty array)`| (changed)| `<boolean: true>` |
| `reversed=(object)`| (changed)| `<boolean: true>` |
| `reversed=(numeric string)`| (changed)| `<boolean: true>` |
| `reversed=(-1)`| (changed)| `<boolean: true>` |
| `reversed=(0)`| (initial)| `<boolean: false>` |
| `reversed=(integer)`| (changed)| `<boolean: true>` |
| `reversed=(NaN)`| (initial, warning)| `<boolean: false>` |
| `reversed=(float)`| (changed)| `<boolean: true>` |
| `reversed=(true)`| (changed)| `<boolean: true>` |
| `reversed=(false)`| (initial)| `<boolean: false>` |
| `reversed=(string 'true')`| (changed, warning)| `<boolean: true>` |
| `reversed=(string 'false')`| (changed, warning)| `<boolean: true>` |
| `reversed=(string 'on')`| (changed)| `<boolean: true>` |
| `reversed=(string 'off')`| (changed)| `<boolean: true>` |
| `reversed=(symbol)`| (initial, warning)| `<boolean: false>` |
| `reversed=(function)`| (initial, warning)| `<boolean: false>` |
| `reversed=(null)`| (initial)| `<boolean: false>` |
| `reversed=(undefined)`| (initial)| `<boolean: false>` |

## `role` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `role=(string)`| (changed)| `"a string"` |
| `role=(empty string)`| (changed)| `<empty string>` |
| `role=(array with string)`| (changed)| `"string"` |
| `role=(empty array)`| (changed)| `<empty string>` |
| `role=(object)`| (changed)| `"result of toString()"` |
| `role=(numeric string)`| (changed)| `"42"` |
| `role=(-1)`| (changed)| `"-1"` |
| `role=(0)`| (changed)| `"0"` |
| `role=(integer)`| (changed)| `"1"` |
| `role=(NaN)`| (changed, warning)| `"NaN"` |
| `role=(float)`| (changed)| `"99.99"` |
| `role=(true)`| (initial, warning)| `<null>` |
| `role=(false)`| (initial, warning)| `<null>` |
| `role=(string 'true')`| (changed)| `"true"` |
| `role=(string 'false')`| (changed)| `"false"` |
| `role=(string 'on')`| (changed)| `"on"` |
| `role=(string 'off')`| (changed)| `"off"` |
| `role=(symbol)`| (initial, warning)| `<null>` |
| `role=(function)`| (initial, warning)| `<null>` |
| `role=(null)`| (initial)| `<null>` |
| `role=(undefined)`| (initial)| `<null>` |

## `rotate` (on `<altGlyph>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `rotate=(string)`| (initial)| `<null>` |
| `rotate=(empty string)`| (initial)| `<null>` |
| `rotate=(array with string)`| (initial)| `<null>` |
| `rotate=(empty array)`| (initial)| `<null>` |
| `rotate=(object)`| (initial)| `<null>` |
| `rotate=(numeric string)`| (initial)| `<null>` |
| `rotate=(-1)`| (initial)| `<null>` |
| `rotate=(0)`| (initial)| `<null>` |
| `rotate=(integer)`| (initial)| `<null>` |
| `rotate=(NaN)`| (initial, warning)| `<null>` |
| `rotate=(float)`| (initial)| `<null>` |
| `rotate=(true)`| (initial, warning)| `<null>` |
| `rotate=(false)`| (initial, warning)| `<null>` |
| `rotate=(string 'true')`| (initial)| `<null>` |
| `rotate=(string 'false')`| (initial)| `<null>` |
| `rotate=(string 'on')`| (initial)| `<null>` |
| `rotate=(string 'off')`| (initial)| `<null>` |
| `rotate=(symbol)`| (initial, warning)| `<null>` |
| `rotate=(function)`| (initial, warning)| `<null>` |
| `rotate=(null)`| (initial)| `<null>` |
| `rotate=(undefined)`| (initial)| `<null>` |

## `rows` (on `<textarea>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `rows=(string)`| (initial)| `<number: 2>` |
| `rows=(empty string)`| (initial)| `<number: 2>` |
| `rows=(array with string)`| (initial)| `<number: 2>` |
| `rows=(empty array)`| (initial)| `<number: 2>` |
| `rows=(object)`| (initial)| `<number: 2>` |
| `rows=(numeric string)`| (changed)| `<number: 42>` |
| `rows=(-1)`| (initial)| `<number: 2>` |
| `rows=(0)`| (initial)| `<number: 2>` |
| `rows=(integer)`| (changed)| `<number: 1>` |
| `rows=(NaN)`| (initial, warning)| `<number: 2>` |
| `rows=(float)`| (changed)| `<number: 99>` |
| `rows=(true)`| (initial, warning)| `<number: 2>` |
| `rows=(false)`| (initial, warning)| `<number: 2>` |
| `rows=(string 'true')`| (initial)| `<number: 2>` |
| `rows=(string 'false')`| (initial)| `<number: 2>` |
| `rows=(string 'on')`| (initial)| `<number: 2>` |
| `rows=(string 'off')`| (initial)| `<number: 2>` |
| `rows=(symbol)`| (initial, warning)| `<number: 2>` |
| `rows=(function)`| (initial, warning)| `<number: 2>` |
| `rows=(null)`| (initial)| `<number: 2>` |
| `rows=(undefined)`| (initial)| `<number: 2>` |

## `rowSpan` (on `<td>` inside `<tr>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `rowSpan=(string)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(empty string)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(array with string)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(empty array)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(object)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(numeric string)`| (changed, ssr error, ssr mismatch)| `<number: 42>` |
| `rowSpan=(-1)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(0)`| (changed, ssr error, ssr mismatch)| `<number: 0>` |
| `rowSpan=(integer)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(NaN)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(float)`| (changed, ssr error, ssr mismatch)| `<number: 99>` |
| `rowSpan=(true)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(false)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(string 'true')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(string 'false')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(string 'on')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(string 'off')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(symbol)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(function)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(null)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `rowSpan=(undefined)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |

## `rx` (on `<ellipse>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `rx=(string)`| (changed)| `<SVGLength: 1px>` |
| `rx=(empty string)`| (initial)| `<SVGLength: 0>` |
| `rx=(array with string)`| (changed)| `<SVGLength: 1px>` |
| `rx=(empty array)`| (initial)| `<SVGLength: 0>` |
| `rx=(object)`| (initial)| `<SVGLength: 0>` |
| `rx=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `rx=(-1)`| (changed)| `<SVGLength: -1>` |
| `rx=(0)`| (initial)| `<SVGLength: 0>` |
| `rx=(integer)`| (changed)| `<SVGLength: 1>` |
| `rx=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `rx=(float)`| (changed)| `<SVGLength: 99.99>` |
| `rx=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `rx=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `rx=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `rx=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `rx=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `rx=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `rx=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `rx=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `rx=(null)`| (initial)| `<SVGLength: 0>` |
| `rx=(undefined)`| (initial)| `<SVGLength: 0>` |

## `ry` (on `<ellipse>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `ry=(string)`| (changed)| `<SVGLength: 2px>` |
| `ry=(empty string)`| (initial)| `<SVGLength: 0>` |
| `ry=(array with string)`| (changed)| `<SVGLength: 2px>` |
| `ry=(empty array)`| (initial)| `<SVGLength: 0>` |
| `ry=(object)`| (initial)| `<SVGLength: 0>` |
| `ry=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `ry=(-1)`| (changed)| `<SVGLength: -1>` |
| `ry=(0)`| (initial)| `<SVGLength: 0>` |
| `ry=(integer)`| (changed)| `<SVGLength: 1>` |
| `ry=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `ry=(float)`| (changed)| `<SVGLength: 99.99>` |
| `ry=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `ry=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `ry=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `ry=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `ry=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `ry=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `ry=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `ry=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `ry=(null)`| (initial)| `<SVGLength: 0>` |
| `ry=(undefined)`| (initial)| `<SVGLength: 0>` |

## `sandbox` (on `<iframe>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `sandbox=(string)`| (changed)| `["allow-forms", "allow-scripts"]` |
| `sandbox=(empty string)`| (initial)| `[]` |
| `sandbox=(array with string)`| (changed)| `["allow-forms", "allow-scripts"]` |
| `sandbox=(empty array)`| (initial)| `[]` |
| `sandbox=(object)`| (changed)| `["result", "of", "toString()"]` |
| `sandbox=(numeric string)`| (changed)| `["42"]` |
| `sandbox=(-1)`| (changed)| `["-1"]` |
| `sandbox=(0)`| (changed)| `["0"]` |
| `sandbox=(integer)`| (changed)| `["1"]` |
| `sandbox=(NaN)`| (changed, warning)| `["NaN"]` |
| `sandbox=(float)`| (changed)| `["99.99"]` |
| `sandbox=(true)`| (initial, warning)| `[]` |
| `sandbox=(false)`| (initial, warning)| `[]` |
| `sandbox=(string 'true')`| (changed)| `["true"]` |
| `sandbox=(string 'false')`| (changed)| `["false"]` |
| `sandbox=(string 'on')`| (changed)| `["on"]` |
| `sandbox=(string 'off')`| (changed)| `["off"]` |
| `sandbox=(symbol)`| (initial, warning)| `[]` |
| `sandbox=(function)`| (initial, warning)| `[]` |
| `sandbox=(null)`| (initial)| `[]` |
| `sandbox=(undefined)`| (initial)| `[]` |

## `scale` (on `<feDisplacementMap>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `scale=(string)`| (initial)| `<number: 0>` |
| `scale=(empty string)`| (initial)| `<number: 0>` |
| `scale=(array with string)`| (initial)| `<number: 0>` |
| `scale=(empty array)`| (initial)| `<number: 0>` |
| `scale=(object)`| (initial)| `<number: 0>` |
| `scale=(numeric string)`| (changed)| `<number: 42>` |
| `scale=(-1)`| (changed)| `<number: -1>` |
| `scale=(0)`| (initial)| `<number: 0>` |
| `scale=(integer)`| (changed)| `<number: 1>` |
| `scale=(NaN)`| (initial, warning)| `<number: 0>` |
| `scale=(float)`| (changed)| `<number: 99.98999786376953>` |
| `scale=(true)`| (initial, warning)| `<number: 0>` |
| `scale=(false)`| (initial, warning)| `<number: 0>` |
| `scale=(string 'true')`| (initial)| `<number: 0>` |
| `scale=(string 'false')`| (initial)| `<number: 0>` |
| `scale=(string 'on')`| (initial)| `<number: 0>` |
| `scale=(string 'off')`| (initial)| `<number: 0>` |
| `scale=(symbol)`| (initial, warning)| `<number: 0>` |
| `scale=(function)`| (initial, warning)| `<number: 0>` |
| `scale=(null)`| (initial)| `<number: 0>` |
| `scale=(undefined)`| (initial)| `<number: 0>` |

## `scope` (on `<th>` inside `<tr>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `scope=(string)`| (changed, ssr error, ssr mismatch)| `"row"` |
| `scope=(empty string)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(array with string)`| (changed, ssr error, ssr mismatch)| `"row"` |
| `scope=(empty array)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(object)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(numeric string)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(-1)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(0)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(integer)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(NaN)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(float)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(true)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(false)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(string 'true')`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(string 'false')`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(string 'on')`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(string 'off')`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(symbol)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(function)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(null)`| (initial, ssr error, ssr mismatch)| `<empty string>` |
| `scope=(undefined)`| (initial, ssr error, ssr mismatch)| `<empty string>` |

## `scoped` (on `<style>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `scoped=(string)`| (changed)| `<empty string>` |
| `scoped=(empty string)`| (initial)| `<null>` |
| `scoped=(array with string)`| (changed)| `<empty string>` |
| `scoped=(empty array)`| (changed)| `<empty string>` |
| `scoped=(object)`| (changed)| `<empty string>` |
| `scoped=(numeric string)`| (changed)| `<empty string>` |
| `scoped=(-1)`| (changed)| `<empty string>` |
| `scoped=(0)`| (initial)| `<null>` |
| `scoped=(integer)`| (changed)| `<empty string>` |
| `scoped=(NaN)`| (initial, warning)| `<null>` |
| `scoped=(float)`| (changed)| `<empty string>` |
| `scoped=(true)`| (changed)| `<empty string>` |
| `scoped=(false)`| (initial)| `<null>` |
| `scoped=(string 'true')`| (changed, warning)| `<empty string>` |
| `scoped=(string 'false')`| (changed, warning)| `<empty string>` |
| `scoped=(string 'on')`| (changed)| `<empty string>` |
| `scoped=(string 'off')`| (changed)| `<empty string>` |
| `scoped=(symbol)`| (initial, warning)| `<null>` |
| `scoped=(function)`| (initial, warning)| `<null>` |
| `scoped=(null)`| (initial)| `<null>` |
| `scoped=(undefined)`| (initial)| `<null>` |

## `scrolling` (on `<iframe>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `scrolling=(string)`| (changed)| `"no"` |
| `scrolling=(empty string)`| (initial)| `<empty string>` |
| `scrolling=(array with string)`| (changed)| `"no"` |
| `scrolling=(empty array)`| (initial)| `<empty string>` |
| `scrolling=(object)`| (changed)| `"result of toString()"` |
| `scrolling=(numeric string)`| (changed)| `"42"` |
| `scrolling=(-1)`| (changed)| `"-1"` |
| `scrolling=(0)`| (changed)| `"0"` |
| `scrolling=(integer)`| (changed)| `"1"` |
| `scrolling=(NaN)`| (changed, warning)| `"NaN"` |
| `scrolling=(float)`| (changed)| `"99.99"` |
| `scrolling=(true)`| (initial, warning)| `<empty string>` |
| `scrolling=(false)`| (initial, warning)| `<empty string>` |
| `scrolling=(string 'true')`| (changed)| `"true"` |
| `scrolling=(string 'false')`| (changed)| `"false"` |
| `scrolling=(string 'on')`| (changed)| `"on"` |
| `scrolling=(string 'off')`| (changed)| `"off"` |
| `scrolling=(symbol)`| (initial, warning)| `<empty string>` |
| `scrolling=(function)`| (initial, warning)| `<empty string>` |
| `scrolling=(null)`| (initial)| `<empty string>` |
| `scrolling=(undefined)`| (initial)| `<empty string>` |

## `seamless` (on `<iframe>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `seamless=(string)`| (changed)| `<empty string>` |
| `seamless=(empty string)`| (initial)| `<null>` |
| `seamless=(array with string)`| (changed)| `<empty string>` |
| `seamless=(empty array)`| (changed)| `<empty string>` |
| `seamless=(object)`| (changed)| `<empty string>` |
| `seamless=(numeric string)`| (changed)| `<empty string>` |
| `seamless=(-1)`| (changed)| `<empty string>` |
| `seamless=(0)`| (initial)| `<null>` |
| `seamless=(integer)`| (changed)| `<empty string>` |
| `seamless=(NaN)`| (initial, warning)| `<null>` |
| `seamless=(float)`| (changed)| `<empty string>` |
| `seamless=(true)`| (changed)| `<empty string>` |
| `seamless=(false)`| (initial)| `<null>` |
| `seamless=(string 'true')`| (changed, warning)| `<empty string>` |
| `seamless=(string 'false')`| (changed, warning)| `<empty string>` |
| `seamless=(string 'on')`| (changed)| `<empty string>` |
| `seamless=(string 'off')`| (changed)| `<empty string>` |
| `seamless=(symbol)`| (initial, warning)| `<null>` |
| `seamless=(function)`| (initial, warning)| `<null>` |
| `seamless=(null)`| (initial)| `<null>` |
| `seamless=(undefined)`| (initial)| `<null>` |

## `security` (on `<iframe>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `security=(string)`| (changed)| `"a string"` |
| `security=(empty string)`| (changed)| `<empty string>` |
| `security=(array with string)`| (changed)| `"string"` |
| `security=(empty array)`| (changed)| `<empty string>` |
| `security=(object)`| (changed)| `"result of toString()"` |
| `security=(numeric string)`| (changed)| `"42"` |
| `security=(-1)`| (changed)| `"-1"` |
| `security=(0)`| (changed)| `"0"` |
| `security=(integer)`| (changed)| `"1"` |
| `security=(NaN)`| (changed, warning)| `"NaN"` |
| `security=(float)`| (changed)| `"99.99"` |
| `security=(true)`| (initial, warning)| `<null>` |
| `security=(false)`| (initial, warning)| `<null>` |
| `security=(string 'true')`| (changed)| `"true"` |
| `security=(string 'false')`| (changed)| `"false"` |
| `security=(string 'on')`| (changed)| `"on"` |
| `security=(string 'off')`| (changed)| `"off"` |
| `security=(symbol)`| (initial, warning)| `<null>` |
| `security=(function)`| (initial, warning)| `<null>` |
| `security=(null)`| (initial)| `<null>` |
| `security=(undefined)`| (initial)| `<null>` |

## `seed` (on `<feTurbulence>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `seed=(string)`| (initial)| `<number: 0>` |
| `seed=(empty string)`| (initial)| `<number: 0>` |
| `seed=(array with string)`| (initial)| `<number: 0>` |
| `seed=(empty array)`| (initial)| `<number: 0>` |
| `seed=(object)`| (initial)| `<number: 0>` |
| `seed=(numeric string)`| (changed)| `<number: 42>` |
| `seed=(-1)`| (changed)| `<number: -1>` |
| `seed=(0)`| (initial)| `<number: 0>` |
| `seed=(integer)`| (changed)| `<number: 1>` |
| `seed=(NaN)`| (initial, warning)| `<number: 0>` |
| `seed=(float)`| (changed)| `<number: 99.98999786376953>` |
| `seed=(true)`| (initial, warning)| `<number: 0>` |
| `seed=(false)`| (initial, warning)| `<number: 0>` |
| `seed=(string 'true')`| (initial)| `<number: 0>` |
| `seed=(string 'false')`| (initial)| `<number: 0>` |
| `seed=(string 'on')`| (initial)| `<number: 0>` |
| `seed=(string 'off')`| (initial)| `<number: 0>` |
| `seed=(symbol)`| (initial, warning)| `<number: 0>` |
| `seed=(function)`| (initial, warning)| `<number: 0>` |
| `seed=(null)`| (initial)| `<number: 0>` |
| `seed=(undefined)`| (initial)| `<number: 0>` |

## `selected` (on `<option>` inside `<select>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `selected=(string)`| (initial, warning)| `<boolean: true>` |
| `selected=(empty string)`| (initial, warning)| `<boolean: true>` |
| `selected=(array with string)`| (initial, warning)| `<boolean: true>` |
| `selected=(empty array)`| (initial, warning)| `<boolean: true>` |
| `selected=(object)`| (initial, warning)| `<boolean: true>` |
| `selected=(numeric string)`| (initial, warning)| `<boolean: true>` |
| `selected=(-1)`| (initial, warning)| `<boolean: true>` |
| `selected=(0)`| (initial, warning)| `<boolean: true>` |
| `selected=(integer)`| (initial, warning)| `<boolean: true>` |
| `selected=(NaN)`| (initial, warning)| `<boolean: true>` |
| `selected=(float)`| (initial, warning)| `<boolean: true>` |
| `selected=(true)`| (initial, warning)| `<boolean: true>` |
| `selected=(false)`| (initial, warning)| `<boolean: true>` |
| `selected=(string 'true')`| (initial, warning)| `<boolean: true>` |
| `selected=(string 'false')`| (initial, warning)| `<boolean: true>` |
| `selected=(string 'on')`| (initial, warning)| `<boolean: true>` |
| `selected=(string 'off')`| (initial, warning)| `<boolean: true>` |
| `selected=(symbol)`| (initial, warning)| `<boolean: true>` |
| `selected=(function)`| (initial, warning)| `<boolean: true>` |
| `selected=(null)`| (initial)| `<boolean: true>` |
| `selected=(undefined)`| (initial)| `<boolean: true>` |

## `selectedIndex` (on `<select>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `selectedIndex=(string)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(empty string)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(array with string)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(empty array)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(object)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(numeric string)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(-1)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(0)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(integer)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(NaN)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(float)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(true)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(false)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(string 'true')`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(string 'false')`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(string 'on')`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(string 'off')`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(symbol)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(function)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(null)`| (initial, warning)| `<number: -1>` |
| `selectedIndex=(undefined)`| (initial, warning)| `<number: -1>` |

## `shape` (on `<a>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `shape=(string)`| (changed)| `"a string"` |
| `shape=(empty string)`| (initial)| `<empty string>` |
| `shape=(array with string)`| (changed)| `"string"` |
| `shape=(empty array)`| (initial)| `<empty string>` |
| `shape=(object)`| (changed)| `"result of toString()"` |
| `shape=(numeric string)`| (changed)| `"42"` |
| `shape=(-1)`| (changed)| `"-1"` |
| `shape=(0)`| (changed)| `"0"` |
| `shape=(integer)`| (changed)| `"1"` |
| `shape=(NaN)`| (changed, warning)| `"NaN"` |
| `shape=(float)`| (changed)| `"99.99"` |
| `shape=(true)`| (initial, warning)| `<empty string>` |
| `shape=(false)`| (initial, warning)| `<empty string>` |
| `shape=(string 'true')`| (changed)| `"true"` |
| `shape=(string 'false')`| (changed)| `"false"` |
| `shape=(string 'on')`| (changed)| `"on"` |
| `shape=(string 'off')`| (changed)| `"off"` |
| `shape=(symbol)`| (initial, warning)| `<empty string>` |
| `shape=(function)`| (initial, warning)| `<empty string>` |
| `shape=(null)`| (initial)| `<empty string>` |
| `shape=(undefined)`| (initial)| `<empty string>` |

## `shape-rendering` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `shape-rendering=(string)`| (changed, warning)| `"a string"` |
| `shape-rendering=(empty string)`| (changed, warning)| `<empty string>` |
| `shape-rendering=(array with string)`| (changed, warning)| `"string"` |
| `shape-rendering=(empty array)`| (changed, warning)| `<empty string>` |
| `shape-rendering=(object)`| (changed, warning)| `"result of toString()"` |
| `shape-rendering=(numeric string)`| (changed, warning)| `"42"` |
| `shape-rendering=(-1)`| (changed, warning)| `"-1"` |
| `shape-rendering=(0)`| (changed, warning)| `"0"` |
| `shape-rendering=(integer)`| (changed, warning)| `"1"` |
| `shape-rendering=(NaN)`| (changed, warning)| `"NaN"` |
| `shape-rendering=(float)`| (changed, warning)| `"99.99"` |
| `shape-rendering=(true)`| (initial, warning)| `<null>` |
| `shape-rendering=(false)`| (initial, warning)| `<null>` |
| `shape-rendering=(string 'true')`| (changed, warning)| `"true"` |
| `shape-rendering=(string 'false')`| (changed, warning)| `"false"` |
| `shape-rendering=(string 'on')`| (changed, warning)| `"on"` |
| `shape-rendering=(string 'off')`| (changed, warning)| `"off"` |
| `shape-rendering=(symbol)`| (initial, warning)| `<null>` |
| `shape-rendering=(function)`| (initial, warning)| `<null>` |
| `shape-rendering=(null)`| (initial, warning)| `<null>` |
| `shape-rendering=(undefined)`| (initial, warning)| `<null>` |

## `shapeRendering` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `shapeRendering=(string)`| (changed)| `"a string"` |
| `shapeRendering=(empty string)`| (changed)| `<empty string>` |
| `shapeRendering=(array with string)`| (changed)| `"string"` |
| `shapeRendering=(empty array)`| (changed)| `<empty string>` |
| `shapeRendering=(object)`| (changed)| `"result of toString()"` |
| `shapeRendering=(numeric string)`| (changed)| `"42"` |
| `shapeRendering=(-1)`| (changed)| `"-1"` |
| `shapeRendering=(0)`| (changed)| `"0"` |
| `shapeRendering=(integer)`| (changed)| `"1"` |
| `shapeRendering=(NaN)`| (changed, warning)| `"NaN"` |
| `shapeRendering=(float)`| (changed)| `"99.99"` |
| `shapeRendering=(true)`| (initial, warning)| `<null>` |
| `shapeRendering=(false)`| (initial, warning)| `<null>` |
| `shapeRendering=(string 'true')`| (changed)| `"true"` |
| `shapeRendering=(string 'false')`| (changed)| `"false"` |
| `shapeRendering=(string 'on')`| (changed)| `"on"` |
| `shapeRendering=(string 'off')`| (changed)| `"off"` |
| `shapeRendering=(symbol)`| (initial, warning)| `<null>` |
| `shapeRendering=(function)`| (initial, warning)| `<null>` |
| `shapeRendering=(null)`| (initial)| `<null>` |
| `shapeRendering=(undefined)`| (initial)| `<null>` |

## `size` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `size=(string)`| (initial)| `<number: 20>` |
| `size=(empty string)`| (initial)| `<number: 20>` |
| `size=(array with string)`| (initial)| `<number: 20>` |
| `size=(empty array)`| (initial)| `<number: 20>` |
| `size=(object)`| (initial)| `<number: 20>` |
| `size=(numeric string)`| (changed)| `<number: 42>` |
| `size=(-1)`| (initial)| `<number: 20>` |
| `size=(0)`| (initial)| `<number: 20>` |
| `size=(integer)`| (changed)| `<number: 1>` |
| `size=(NaN)`| (initial, warning)| `<number: 20>` |
| `size=(float)`| (changed)| `<number: 99>` |
| `size=(true)`| (initial, warning)| `<number: 20>` |
| `size=(false)`| (initial, warning)| `<number: 20>` |
| `size=(string 'true')`| (initial)| `<number: 20>` |
| `size=(string 'false')`| (initial)| `<number: 20>` |
| `size=(string 'on')`| (initial)| `<number: 20>` |
| `size=(string 'off')`| (initial)| `<number: 20>` |
| `size=(symbol)`| (initial, warning)| `<number: 20>` |
| `size=(function)`| (initial, warning)| `<number: 20>` |
| `size=(null)`| (initial)| `<number: 20>` |
| `size=(undefined)`| (initial)| `<number: 20>` |

## `sizes` (on `<link>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `sizes=(string)`| (changed)| `["a", "string"]` |
| `sizes=(empty string)`| (initial)| `[]` |
| `sizes=(array with string)`| (changed)| `["string"]` |
| `sizes=(empty array)`| (initial)| `[]` |
| `sizes=(object)`| (changed)| `["result", "of", "toString()"]` |
| `sizes=(numeric string)`| (changed)| `["42"]` |
| `sizes=(-1)`| (changed)| `["-1"]` |
| `sizes=(0)`| (changed)| `["0"]` |
| `sizes=(integer)`| (changed)| `["1"]` |
| `sizes=(NaN)`| (changed, warning)| `["NaN"]` |
| `sizes=(float)`| (changed)| `["99.99"]` |
| `sizes=(true)`| (initial, warning)| `[]` |
| `sizes=(false)`| (initial, warning)| `[]` |
| `sizes=(string 'true')`| (changed)| `["true"]` |
| `sizes=(string 'false')`| (changed)| `["false"]` |
| `sizes=(string 'on')`| (changed)| `["on"]` |
| `sizes=(string 'off')`| (changed)| `["off"]` |
| `sizes=(symbol)`| (initial, warning)| `[]` |
| `sizes=(function)`| (initial, warning)| `[]` |
| `sizes=(null)`| (initial)| `[]` |
| `sizes=(undefined)`| (initial)| `[]` |

## `slope` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `slope=(string)`| (changed)| `"a string"` |
| `slope=(empty string)`| (changed)| `<empty string>` |
| `slope=(array with string)`| (changed)| `"string"` |
| `slope=(empty array)`| (changed)| `<empty string>` |
| `slope=(object)`| (changed)| `"result of toString()"` |
| `slope=(numeric string)`| (changed)| `"42"` |
| `slope=(-1)`| (changed)| `"-1"` |
| `slope=(0)`| (changed)| `"0"` |
| `slope=(integer)`| (changed)| `"1"` |
| `slope=(NaN)`| (changed, warning)| `"NaN"` |
| `slope=(float)`| (changed)| `"99.99"` |
| `slope=(true)`| (initial, warning)| `<null>` |
| `slope=(false)`| (initial, warning)| `<null>` |
| `slope=(string 'true')`| (changed)| `"true"` |
| `slope=(string 'false')`| (changed)| `"false"` |
| `slope=(string 'on')`| (changed)| `"on"` |
| `slope=(string 'off')`| (changed)| `"off"` |
| `slope=(symbol)`| (initial, warning)| `<null>` |
| `slope=(function)`| (initial, warning)| `<null>` |
| `slope=(null)`| (initial)| `<null>` |
| `slope=(undefined)`| (initial)| `<null>` |

## `spacing` (on `<textPath>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `spacing=(string)`| (changed)| `<number: 1>` |
| `spacing=(empty string)`| (initial)| `<number: 2>` |
| `spacing=(array with string)`| (changed)| `<number: 1>` |
| `spacing=(empty array)`| (initial)| `<number: 2>` |
| `spacing=(object)`| (initial)| `<number: 2>` |
| `spacing=(numeric string)`| (initial)| `<number: 2>` |
| `spacing=(-1)`| (initial)| `<number: 2>` |
| `spacing=(0)`| (initial)| `<number: 2>` |
| `spacing=(integer)`| (initial)| `<number: 2>` |
| `spacing=(NaN)`| (initial, warning)| `<number: 2>` |
| `spacing=(float)`| (initial)| `<number: 2>` |
| `spacing=(true)`| (initial, warning)| `<number: 2>` |
| `spacing=(false)`| (initial, warning)| `<number: 2>` |
| `spacing=(string 'true')`| (initial)| `<number: 2>` |
| `spacing=(string 'false')`| (initial)| `<number: 2>` |
| `spacing=(string 'on')`| (initial)| `<number: 2>` |
| `spacing=(string 'off')`| (initial)| `<number: 2>` |
| `spacing=(symbol)`| (initial, warning)| `<number: 2>` |
| `spacing=(function)`| (initial, warning)| `<number: 2>` |
| `spacing=(null)`| (initial)| `<number: 2>` |
| `spacing=(undefined)`| (initial)| `<number: 2>` |

## `span` (on `<col>` inside `<colgroup>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `span=(string)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(empty string)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(array with string)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(empty array)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(object)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(numeric string)`| (changed, ssr error, ssr mismatch)| `<number: 42>` |
| `span=(-1)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(0)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(integer)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(NaN)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(float)`| (changed, ssr error, ssr mismatch)| `<number: 99>` |
| `span=(true)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(false)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(string 'true')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(string 'false')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(string 'on')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(string 'off')`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(symbol)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(function)`| (initial, warning, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(null)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |
| `span=(undefined)`| (initial, ssr error, ssr mismatch)| `<number: 1>` |

## `specularConstant` (on `<feSpecularLighting>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `specularConstant=(string)`| (initial)| `<number: 1>` |
| `specularConstant=(empty string)`| (changed)| `<number: 0>` |
| `specularConstant=(array with string)`| (initial)| `<number: 1>` |
| `specularConstant=(empty array)`| (changed)| `<number: 0>` |
| `specularConstant=(object)`| (initial)| `<number: 1>` |
| `specularConstant=(numeric string)`| (changed)| `<number: 42>` |
| `specularConstant=(-1)`| (changed)| `<number: -1>` |
| `specularConstant=(0)`| (changed)| `<number: 0>` |
| `specularConstant=(integer)`| (initial)| `<number: 1>` |
| `specularConstant=(NaN)`| (initial, warning)| `<number: 1>` |
| `specularConstant=(float)`| (changed)| `<number: 99.98999786376953>` |
| `specularConstant=(true)`| (initial, warning)| `<number: 1>` |
| `specularConstant=(false)`| (initial, warning)| `<number: 1>` |
| `specularConstant=(string 'true')`| (initial)| `<number: 1>` |
| `specularConstant=(string 'false')`| (initial)| `<number: 1>` |
| `specularConstant=(string 'on')`| (initial)| `<number: 1>` |
| `specularConstant=(string 'off')`| (initial)| `<number: 1>` |
| `specularConstant=(symbol)`| (initial, warning)| `<number: 1>` |
| `specularConstant=(function)`| (initial, warning)| `<number: 1>` |
| `specularConstant=(null)`| (initial)| `<number: 1>` |
| `specularConstant=(undefined)`| (initial)| `<number: 1>` |

## `specularExponent` (on `<feSpecularLighting>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `specularExponent=(string)`| (initial)| `<number: 1>` |
| `specularExponent=(empty string)`| (initial)| `<number: 1>` |
| `specularExponent=(array with string)`| (initial)| `<number: 1>` |
| `specularExponent=(empty array)`| (initial)| `<number: 1>` |
| `specularExponent=(object)`| (initial)| `<number: 1>` |
| `specularExponent=(numeric string)`| (initial)| `<number: 1>` |
| `specularExponent=(-1)`| (initial)| `<number: 1>` |
| `specularExponent=(0)`| (initial)| `<number: 1>` |
| `specularExponent=(integer)`| (initial)| `<number: 1>` |
| `specularExponent=(NaN)`| (initial, warning)| `<number: 1>` |
| `specularExponent=(float)`| (initial)| `<number: 1>` |
| `specularExponent=(true)`| (initial, warning)| `<number: 1>` |
| `specularExponent=(false)`| (initial, warning)| `<number: 1>` |
| `specularExponent=(string 'true')`| (initial)| `<number: 1>` |
| `specularExponent=(string 'false')`| (initial)| `<number: 1>` |
| `specularExponent=(string 'on')`| (initial)| `<number: 1>` |
| `specularExponent=(string 'off')`| (initial)| `<number: 1>` |
| `specularExponent=(symbol)`| (initial, warning)| `<number: 1>` |
| `specularExponent=(function)`| (initial, warning)| `<number: 1>` |
| `specularExponent=(null)`| (initial)| `<number: 1>` |
| `specularExponent=(undefined)`| (initial)| `<number: 1>` |

## `speed` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `speed=(string)`| (changed)| `"a string"` |
| `speed=(empty string)`| (changed)| `<empty string>` |
| `speed=(array with string)`| (changed)| `"string"` |
| `speed=(empty array)`| (changed)| `<empty string>` |
| `speed=(object)`| (changed)| `"result of toString()"` |
| `speed=(numeric string)`| (changed)| `"42"` |
| `speed=(-1)`| (changed)| `"-1"` |
| `speed=(0)`| (changed)| `"0"` |
| `speed=(integer)`| (changed)| `"1"` |
| `speed=(NaN)`| (changed, warning)| `"NaN"` |
| `speed=(float)`| (changed)| `"99.99"` |
| `speed=(true)`| (initial, warning)| `<null>` |
| `speed=(false)`| (initial, warning)| `<null>` |
| `speed=(string 'true')`| (changed)| `"true"` |
| `speed=(string 'false')`| (changed)| `"false"` |
| `speed=(string 'on')`| (changed)| `"on"` |
| `speed=(string 'off')`| (changed)| `"off"` |
| `speed=(symbol)`| (initial, warning)| `<null>` |
| `speed=(function)`| (initial, warning)| `<null>` |
| `speed=(null)`| (initial)| `<null>` |
| `speed=(undefined)`| (initial)| `<null>` |

## `spellCheck` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `spellCheck=(string)`| (changed)| `<boolean: false>` |
| `spellCheck=(empty string)`| (initial)| `<boolean: true>` |
| `spellCheck=(array with string)`| (changed)| `<boolean: false>` |
| `spellCheck=(empty array)`| (initial)| `<boolean: true>` |
| `spellCheck=(object)`| (initial)| `<boolean: true>` |
| `spellCheck=(numeric string)`| (initial)| `<boolean: true>` |
| `spellCheck=(-1)`| (initial)| `<boolean: true>` |
| `spellCheck=(0)`| (initial)| `<boolean: true>` |
| `spellCheck=(integer)`| (initial)| `<boolean: true>` |
| `spellCheck=(NaN)`| (initial, warning)| `<boolean: true>` |
| `spellCheck=(float)`| (initial)| `<boolean: true>` |
| `spellCheck=(true)`| (initial)| `<boolean: true>` |
| `spellCheck=(false)`| (changed)| `<boolean: false>` |
| `spellCheck=(string 'true')`| (initial)| `<boolean: true>` |
| `spellCheck=(string 'false')`| (changed)| `<boolean: false>` |
| `spellCheck=(string 'on')`| (initial)| `<boolean: true>` |
| `spellCheck=(string 'off')`| (initial)| `<boolean: true>` |
| `spellCheck=(symbol)`| (initial, warning)| `<boolean: true>` |
| `spellCheck=(function)`| (initial, warning)| `<boolean: true>` |
| `spellCheck=(null)`| (initial)| `<boolean: true>` |
| `spellCheck=(undefined)`| (initial)| `<boolean: true>` |

## `spellcheck` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `spellcheck=(string)`| (changed, warning)| `<boolean: false>` |
| `spellcheck=(empty string)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(array with string)`| (changed, warning)| `<boolean: false>` |
| `spellcheck=(empty array)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(object)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(numeric string)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(-1)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(0)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(integer)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(NaN)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(float)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(true)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(false)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(string 'true')`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(string 'false')`| (changed, warning)| `<boolean: false>` |
| `spellcheck=(string 'on')`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(string 'off')`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(symbol)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(function)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(null)`| (initial, warning)| `<boolean: true>` |
| `spellcheck=(undefined)`| (initial, warning)| `<boolean: true>` |

## `spreadMethod` (on `<linearGradient>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `spreadMethod=(string)`| (changed)| `<number: 2>` |
| `spreadMethod=(empty string)`| (initial)| `<number: 1>` |
| `spreadMethod=(array with string)`| (changed)| `<number: 2>` |
| `spreadMethod=(empty array)`| (initial)| `<number: 1>` |
| `spreadMethod=(object)`| (initial)| `<number: 1>` |
| `spreadMethod=(numeric string)`| (initial)| `<number: 1>` |
| `spreadMethod=(-1)`| (initial)| `<number: 1>` |
| `spreadMethod=(0)`| (initial)| `<number: 1>` |
| `spreadMethod=(integer)`| (initial)| `<number: 1>` |
| `spreadMethod=(NaN)`| (initial, warning)| `<number: 1>` |
| `spreadMethod=(float)`| (initial)| `<number: 1>` |
| `spreadMethod=(true)`| (initial, warning)| `<number: 1>` |
| `spreadMethod=(false)`| (initial, warning)| `<number: 1>` |
| `spreadMethod=(string 'true')`| (initial)| `<number: 1>` |
| `spreadMethod=(string 'false')`| (initial)| `<number: 1>` |
| `spreadMethod=(string 'on')`| (initial)| `<number: 1>` |
| `spreadMethod=(string 'off')`| (initial)| `<number: 1>` |
| `spreadMethod=(symbol)`| (initial, warning)| `<number: 1>` |
| `spreadMethod=(function)`| (initial, warning)| `<number: 1>` |
| `spreadMethod=(null)`| (initial)| `<number: 1>` |
| `spreadMethod=(undefined)`| (initial)| `<number: 1>` |

## `src` (on `<img>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `src=(string)`| (changed)| `"https://reactjs.com/"` |
| `src=(empty string)`| (initial, warning)| `<empty string>` |
| `src=(array with string)`| (changed)| `"https://reactjs.com/"` |
| `src=(empty array)`| (changed)| `"http://localhost:3000/"` |
| `src=(object)`| (changed)| `"http://localhost:3000/result%20of%20toString()"` |
| `src=(numeric string)`| (changed)| `"http://localhost:3000/42"` |
| `src=(-1)`| (changed)| `"http://localhost:3000/-1"` |
| `src=(0)`| (changed)| `"http://localhost:3000/0"` |
| `src=(integer)`| (changed)| `"http://localhost:3000/1"` |
| `src=(NaN)`| (changed, warning)| `"http://localhost:3000/NaN"` |
| `src=(float)`| (changed)| `"http://localhost:3000/99.99"` |
| `src=(true)`| (changed, warning, ssr mismatch)| `"http://localhost:3000/true"` |
| `src=(false)`| (initial, warning)| `<empty string>` |
| `src=(string 'true')`| (changed)| `"http://localhost:3000/true"` |
| `src=(string 'false')`| (changed)| `"http://localhost:3000/false"` |
| `src=(string 'on')`| (changed)| `"http://localhost:3000/on"` |
| `src=(string 'off')`| (changed)| `"http://localhost:3000/off"` |
| `src=(symbol)`| (changed, error, warning, ssr mismatch)| `` |
| `src=(function)`| (changed, warning, ssr mismatch)| `"http://localhost:3000/function%20f()%20%7B%7D"` |
| `src=(null)`| (initial)| `<empty string>` |
| `src=(undefined)`| (initial)| `<empty string>` |

## `srcDoc` (on `<iframe>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `srcDoc=(string)`| (changed)| `"<p>Hi</p>"` |
| `srcDoc=(empty string)`| (initial)| `<empty string>` |
| `srcDoc=(array with string)`| (changed)| `"<p>Hi</p>"` |
| `srcDoc=(empty array)`| (initial)| `<empty string>` |
| `srcDoc=(object)`| (changed)| `"result of toString()"` |
| `srcDoc=(numeric string)`| (changed)| `"42"` |
| `srcDoc=(-1)`| (changed)| `"-1"` |
| `srcDoc=(0)`| (changed)| `"0"` |
| `srcDoc=(integer)`| (changed)| `"1"` |
| `srcDoc=(NaN)`| (changed, warning)| `"NaN"` |
| `srcDoc=(float)`| (changed)| `"99.99"` |
| `srcDoc=(true)`| (initial, warning)| `<empty string>` |
| `srcDoc=(false)`| (initial, warning)| `<empty string>` |
| `srcDoc=(string 'true')`| (changed)| `"true"` |
| `srcDoc=(string 'false')`| (changed)| `"false"` |
| `srcDoc=(string 'on')`| (changed)| `"on"` |
| `srcDoc=(string 'off')`| (changed)| `"off"` |
| `srcDoc=(symbol)`| (initial, warning)| `<empty string>` |
| `srcDoc=(function)`| (initial, warning)| `<empty string>` |
| `srcDoc=(null)`| (initial)| `<empty string>` |
| `srcDoc=(undefined)`| (initial)| `<empty string>` |

## `srcdoc` (on `<iframe>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `srcdoc=(string)`| (changed, warning)| `"<p>Hi</p>"` |
| `srcdoc=(empty string)`| (initial, warning)| `<empty string>` |
| `srcdoc=(array with string)`| (changed, warning)| `"<p>Hi</p>"` |
| `srcdoc=(empty array)`| (initial, warning)| `<empty string>` |
| `srcdoc=(object)`| (changed, warning)| `"result of toString()"` |
| `srcdoc=(numeric string)`| (changed, warning)| `"42"` |
| `srcdoc=(-1)`| (changed, warning)| `"-1"` |
| `srcdoc=(0)`| (changed, warning)| `"0"` |
| `srcdoc=(integer)`| (changed, warning)| `"1"` |
| `srcdoc=(NaN)`| (changed, warning)| `"NaN"` |
| `srcdoc=(float)`| (changed, warning)| `"99.99"` |
| `srcdoc=(true)`| (initial, warning)| `<empty string>` |
| `srcdoc=(false)`| (initial, warning)| `<empty string>` |
| `srcdoc=(string 'true')`| (changed, warning)| `"true"` |
| `srcdoc=(string 'false')`| (changed, warning)| `"false"` |
| `srcdoc=(string 'on')`| (changed, warning)| `"on"` |
| `srcdoc=(string 'off')`| (changed, warning)| `"off"` |
| `srcdoc=(symbol)`| (initial, warning)| `<empty string>` |
| `srcdoc=(function)`| (initial, warning)| `<empty string>` |
| `srcdoc=(null)`| (initial, warning)| `<empty string>` |
| `srcdoc=(undefined)`| (initial, warning)| `<empty string>` |

## `srcLang` (on `<track>` inside `<audio>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `srcLang=(string)`| (changed)| `"en"` |
| `srcLang=(empty string)`| (initial)| `<empty string>` |
| `srcLang=(array with string)`| (changed)| `"en"` |
| `srcLang=(empty array)`| (initial)| `<empty string>` |
| `srcLang=(object)`| (changed)| `"result of toString()"` |
| `srcLang=(numeric string)`| (changed)| `"42"` |
| `srcLang=(-1)`| (changed)| `"-1"` |
| `srcLang=(0)`| (changed)| `"0"` |
| `srcLang=(integer)`| (changed)| `"1"` |
| `srcLang=(NaN)`| (changed, warning)| `"NaN"` |
| `srcLang=(float)`| (changed)| `"99.99"` |
| `srcLang=(true)`| (initial, warning)| `<empty string>` |
| `srcLang=(false)`| (initial, warning)| `<empty string>` |
| `srcLang=(string 'true')`| (changed)| `"true"` |
| `srcLang=(string 'false')`| (changed)| `"false"` |
| `srcLang=(string 'on')`| (changed)| `"on"` |
| `srcLang=(string 'off')`| (changed)| `"off"` |
| `srcLang=(symbol)`| (initial, warning)| `<empty string>` |
| `srcLang=(function)`| (initial, warning)| `<empty string>` |
| `srcLang=(null)`| (initial)| `<empty string>` |
| `srcLang=(undefined)`| (initial)| `<empty string>` |

## `srclang` (on `<track>` inside `<audio>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `srclang=(string)`| (changed, warning)| `"en"` |
| `srclang=(empty string)`| (initial, warning)| `<empty string>` |
| `srclang=(array with string)`| (changed, warning)| `"en"` |
| `srclang=(empty array)`| (initial, warning)| `<empty string>` |
| `srclang=(object)`| (changed, warning)| `"result of toString()"` |
| `srclang=(numeric string)`| (changed, warning)| `"42"` |
| `srclang=(-1)`| (changed, warning)| `"-1"` |
| `srclang=(0)`| (changed, warning)| `"0"` |
| `srclang=(integer)`| (changed, warning)| `"1"` |
| `srclang=(NaN)`| (changed, warning)| `"NaN"` |
| `srclang=(float)`| (changed, warning)| `"99.99"` |
| `srclang=(true)`| (initial, warning)| `<empty string>` |
| `srclang=(false)`| (initial, warning)| `<empty string>` |
| `srclang=(string 'true')`| (changed, warning)| `"true"` |
| `srclang=(string 'false')`| (changed, warning)| `"false"` |
| `srclang=(string 'on')`| (changed, warning)| `"on"` |
| `srclang=(string 'off')`| (changed, warning)| `"off"` |
| `srclang=(symbol)`| (initial, warning)| `<empty string>` |
| `srclang=(function)`| (initial, warning)| `<empty string>` |
| `srclang=(null)`| (initial, warning)| `<empty string>` |
| `srclang=(undefined)`| (initial, warning)| `<empty string>` |

## `srcSet` (on `<img>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `srcSet=(string)`| (initial)| `<undefined>` |
| `srcSet=(empty string)`| (initial)| `<undefined>` |
| `srcSet=(array with string)`| (initial)| `<undefined>` |
| `srcSet=(empty array)`| (initial)| `<undefined>` |
| `srcSet=(object)`| (initial)| `<undefined>` |
| `srcSet=(numeric string)`| (initial)| `<undefined>` |
| `srcSet=(-1)`| (initial)| `<undefined>` |
| `srcSet=(0)`| (initial)| `<undefined>` |
| `srcSet=(integer)`| (initial)| `<undefined>` |
| `srcSet=(NaN)`| (initial, warning)| `<undefined>` |
| `srcSet=(float)`| (initial)| `<undefined>` |
| `srcSet=(true)`| (initial, warning)| `<undefined>` |
| `srcSet=(false)`| (initial, warning)| `<undefined>` |
| `srcSet=(string 'true')`| (initial)| `<undefined>` |
| `srcSet=(string 'false')`| (initial)| `<undefined>` |
| `srcSet=(string 'on')`| (initial)| `<undefined>` |
| `srcSet=(string 'off')`| (initial)| `<undefined>` |
| `srcSet=(symbol)`| (initial, warning)| `<undefined>` |
| `srcSet=(function)`| (initial, warning)| `<undefined>` |
| `srcSet=(null)`| (initial)| `<undefined>` |
| `srcSet=(undefined)`| (initial)| `<undefined>` |

## `srcset` (on `<img>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `srcset=(string)`| (changed, warning)| `"a string"` |
| `srcset=(empty string)`| (initial, warning)| `<empty string>` |
| `srcset=(array with string)`| (changed, warning)| `"string"` |
| `srcset=(empty array)`| (initial, warning)| `<empty string>` |
| `srcset=(object)`| (changed, warning)| `"result of toString()"` |
| `srcset=(numeric string)`| (changed, warning)| `"42"` |
| `srcset=(-1)`| (changed, warning)| `"-1"` |
| `srcset=(0)`| (changed, warning)| `"0"` |
| `srcset=(integer)`| (changed, warning)| `"1"` |
| `srcset=(NaN)`| (changed, warning)| `"NaN"` |
| `srcset=(float)`| (changed, warning)| `"99.99"` |
| `srcset=(true)`| (initial, warning)| `<empty string>` |
| `srcset=(false)`| (initial, warning)| `<empty string>` |
| `srcset=(string 'true')`| (changed, warning)| `"true"` |
| `srcset=(string 'false')`| (changed, warning)| `"false"` |
| `srcset=(string 'on')`| (changed, warning)| `"on"` |
| `srcset=(string 'off')`| (changed, warning)| `"off"` |
| `srcset=(symbol)`| (initial, warning)| `<empty string>` |
| `srcset=(function)`| (initial, warning)| `<empty string>` |
| `srcset=(null)`| (initial, warning)| `<empty string>` |
| `srcset=(undefined)`| (initial, warning)| `<empty string>` |

## `start` (on `<ol>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `start=(string)`| (initial)| `<number: 1>` |
| `start=(empty string)`| (initial)| `<number: 1>` |
| `start=(array with string)`| (initial)| `<number: 1>` |
| `start=(empty array)`| (initial)| `<number: 1>` |
| `start=(object)`| (initial)| `<number: 1>` |
| `start=(numeric string)`| (changed)| `<number: 42>` |
| `start=(-1)`| (changed)| `<number: -1>` |
| `start=(0)`| (changed)| `<number: 0>` |
| `start=(integer)`| (initial)| `<number: 1>` |
| `start=(NaN)`| (initial, warning)| `<number: 1>` |
| `start=(float)`| (changed)| `<number: 99>` |
| `start=(true)`| (initial, warning)| `<number: 1>` |
| `start=(false)`| (initial, warning)| `<number: 1>` |
| `start=(string 'true')`| (initial)| `<number: 1>` |
| `start=(string 'false')`| (initial)| `<number: 1>` |
| `start=(string 'on')`| (initial)| `<number: 1>` |
| `start=(string 'off')`| (initial)| `<number: 1>` |
| `start=(symbol)`| (initial, warning)| `<number: 1>` |
| `start=(function)`| (initial, warning)| `<number: 1>` |
| `start=(null)`| (initial)| `<number: 1>` |
| `start=(undefined)`| (initial)| `<number: 1>` |

## `startOffset` (on `<textPath>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `startOffset=(string)`| (initial)| `<SVGLength: 0>` |
| `startOffset=(empty string)`| (initial)| `<SVGLength: 0>` |
| `startOffset=(array with string)`| (initial)| `<SVGLength: 0>` |
| `startOffset=(empty array)`| (initial)| `<SVGLength: 0>` |
| `startOffset=(object)`| (initial)| `<SVGLength: 0>` |
| `startOffset=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `startOffset=(-1)`| (changed)| `<SVGLength: -1>` |
| `startOffset=(0)`| (initial)| `<SVGLength: 0>` |
| `startOffset=(integer)`| (changed)| `<SVGLength: 1>` |
| `startOffset=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `startOffset=(float)`| (changed)| `<SVGLength: 99.99>` |
| `startOffset=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `startOffset=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `startOffset=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `startOffset=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `startOffset=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `startOffset=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `startOffset=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `startOffset=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `startOffset=(null)`| (initial)| `<SVGLength: 0>` |
| `startOffset=(undefined)`| (initial)| `<SVGLength: 0>` |

## `state` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `state=(string)`| (changed)| `"a string"` |
| `state=(empty string)`| (changed)| `<empty string>` |
| `state=(array with string)`| (changed)| `"string"` |
| `state=(empty array)`| (changed)| `<empty string>` |
| `state=(object)`| (changed)| `"result of toString()"` |
| `state=(numeric string)`| (changed)| `"42"` |
| `state=(-1)`| (changed)| `"-1"` |
| `state=(0)`| (changed)| `"0"` |
| `state=(integer)`| (changed)| `"1"` |
| `state=(NaN)`| (changed, warning)| `"NaN"` |
| `state=(float)`| (changed)| `"99.99"` |
| `state=(true)`| (initial, warning)| `<null>` |
| `state=(false)`| (initial, warning)| `<null>` |
| `state=(string 'true')`| (changed)| `"true"` |
| `state=(string 'false')`| (changed)| `"false"` |
| `state=(string 'on')`| (changed)| `"on"` |
| `state=(string 'off')`| (changed)| `"off"` |
| `state=(symbol)`| (initial, warning)| `<null>` |
| `state=(function)`| (initial, warning)| `<null>` |
| `state=(null)`| (initial)| `<null>` |
| `state=(undefined)`| (initial)| `<null>` |

## `stdDeviation` (on `<feGaussianBlur>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stdDeviation=(string)`| (changed)| `"a string"` |
| `stdDeviation=(empty string)`| (changed)| `<empty string>` |
| `stdDeviation=(array with string)`| (changed)| `"string"` |
| `stdDeviation=(empty array)`| (changed)| `<empty string>` |
| `stdDeviation=(object)`| (changed)| `"result of toString()"` |
| `stdDeviation=(numeric string)`| (changed)| `"42"` |
| `stdDeviation=(-1)`| (changed)| `"-1"` |
| `stdDeviation=(0)`| (changed)| `"0"` |
| `stdDeviation=(integer)`| (changed)| `"1"` |
| `stdDeviation=(NaN)`| (changed, warning)| `"NaN"` |
| `stdDeviation=(float)`| (changed)| `"99.99"` |
| `stdDeviation=(true)`| (initial, warning)| `<null>` |
| `stdDeviation=(false)`| (initial, warning)| `<null>` |
| `stdDeviation=(string 'true')`| (changed)| `"true"` |
| `stdDeviation=(string 'false')`| (changed)| `"false"` |
| `stdDeviation=(string 'on')`| (changed)| `"on"` |
| `stdDeviation=(string 'off')`| (changed)| `"off"` |
| `stdDeviation=(symbol)`| (initial, warning)| `<null>` |
| `stdDeviation=(function)`| (initial, warning)| `<null>` |
| `stdDeviation=(null)`| (initial)| `<null>` |
| `stdDeviation=(undefined)`| (initial)| `<null>` |

## `stemh` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stemh=(string)`| (changed)| `"a string"` |
| `stemh=(empty string)`| (changed)| `<empty string>` |
| `stemh=(array with string)`| (changed)| `"string"` |
| `stemh=(empty array)`| (changed)| `<empty string>` |
| `stemh=(object)`| (changed)| `"result of toString()"` |
| `stemh=(numeric string)`| (changed)| `"42"` |
| `stemh=(-1)`| (changed)| `"-1"` |
| `stemh=(0)`| (changed)| `"0"` |
| `stemh=(integer)`| (changed)| `"1"` |
| `stemh=(NaN)`| (changed, warning)| `"NaN"` |
| `stemh=(float)`| (changed)| `"99.99"` |
| `stemh=(true)`| (initial, warning)| `<null>` |
| `stemh=(false)`| (initial, warning)| `<null>` |
| `stemh=(string 'true')`| (changed)| `"true"` |
| `stemh=(string 'false')`| (changed)| `"false"` |
| `stemh=(string 'on')`| (changed)| `"on"` |
| `stemh=(string 'off')`| (changed)| `"off"` |
| `stemh=(symbol)`| (initial, warning)| `<null>` |
| `stemh=(function)`| (initial, warning)| `<null>` |
| `stemh=(null)`| (initial)| `<null>` |
| `stemh=(undefined)`| (initial)| `<null>` |

## `stemv` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stemv=(string)`| (changed)| `"a string"` |
| `stemv=(empty string)`| (changed)| `<empty string>` |
| `stemv=(array with string)`| (changed)| `"string"` |
| `stemv=(empty array)`| (changed)| `<empty string>` |
| `stemv=(object)`| (changed)| `"result of toString()"` |
| `stemv=(numeric string)`| (changed)| `"42"` |
| `stemv=(-1)`| (changed)| `"-1"` |
| `stemv=(0)`| (changed)| `"0"` |
| `stemv=(integer)`| (changed)| `"1"` |
| `stemv=(NaN)`| (changed, warning)| `"NaN"` |
| `stemv=(float)`| (changed)| `"99.99"` |
| `stemv=(true)`| (initial, warning)| `<null>` |
| `stemv=(false)`| (initial, warning)| `<null>` |
| `stemv=(string 'true')`| (changed)| `"true"` |
| `stemv=(string 'false')`| (changed)| `"false"` |
| `stemv=(string 'on')`| (changed)| `"on"` |
| `stemv=(string 'off')`| (changed)| `"off"` |
| `stemv=(symbol)`| (initial, warning)| `<null>` |
| `stemv=(function)`| (initial, warning)| `<null>` |
| `stemv=(null)`| (initial)| `<null>` |
| `stemv=(undefined)`| (initial)| `<null>` |

## `step` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `step=(string)`| (changed)| `"a string"` |
| `step=(empty string)`| (changed)| `<empty string>` |
| `step=(array with string)`| (changed)| `"string"` |
| `step=(empty array)`| (changed)| `<empty string>` |
| `step=(object)`| (changed)| `"result of toString()"` |
| `step=(numeric string)`| (changed)| `"42"` |
| `step=(-1)`| (changed)| `"-1"` |
| `step=(0)`| (changed)| `"0"` |
| `step=(integer)`| (changed)| `"1"` |
| `step=(NaN)`| (changed, warning)| `"NaN"` |
| `step=(float)`| (changed)| `"99.99"` |
| `step=(true)`| (initial, warning)| `<null>` |
| `step=(false)`| (initial, warning)| `<null>` |
| `step=(string 'true')`| (changed)| `"true"` |
| `step=(string 'false')`| (changed)| `"false"` |
| `step=(string 'on')`| (changed)| `"on"` |
| `step=(string 'off')`| (changed)| `"off"` |
| `step=(symbol)`| (initial, warning)| `<null>` |
| `step=(function)`| (initial, warning)| `<null>` |
| `step=(null)`| (initial)| `<null>` |
| `step=(undefined)`| (initial)| `<null>` |

## `stitchTiles` (on `<feTurbulence>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stitchTiles=(string)`| (changed)| `<number: 1>` |
| `stitchTiles=(empty string)`| (initial)| `<number: 2>` |
| `stitchTiles=(array with string)`| (changed)| `<number: 1>` |
| `stitchTiles=(empty array)`| (initial)| `<number: 2>` |
| `stitchTiles=(object)`| (initial)| `<number: 2>` |
| `stitchTiles=(numeric string)`| (initial)| `<number: 2>` |
| `stitchTiles=(-1)`| (initial)| `<number: 2>` |
| `stitchTiles=(0)`| (initial)| `<number: 2>` |
| `stitchTiles=(integer)`| (initial)| `<number: 2>` |
| `stitchTiles=(NaN)`| (initial, warning)| `<number: 2>` |
| `stitchTiles=(float)`| (initial)| `<number: 2>` |
| `stitchTiles=(true)`| (initial, warning)| `<number: 2>` |
| `stitchTiles=(false)`| (initial, warning)| `<number: 2>` |
| `stitchTiles=(string 'true')`| (initial)| `<number: 2>` |
| `stitchTiles=(string 'false')`| (initial)| `<number: 2>` |
| `stitchTiles=(string 'on')`| (initial)| `<number: 2>` |
| `stitchTiles=(string 'off')`| (initial)| `<number: 2>` |
| `stitchTiles=(symbol)`| (initial, warning)| `<number: 2>` |
| `stitchTiles=(function)`| (initial, warning)| `<number: 2>` |
| `stitchTiles=(null)`| (initial)| `<number: 2>` |
| `stitchTiles=(undefined)`| (initial)| `<number: 2>` |

## `stop-color` (on `<stop>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stop-color=(string)`| (changed, warning)| `"a string"` |
| `stop-color=(empty string)`| (changed, warning)| `<empty string>` |
| `stop-color=(array with string)`| (changed, warning)| `"string"` |
| `stop-color=(empty array)`| (changed, warning)| `<empty string>` |
| `stop-color=(object)`| (changed, warning)| `"result of toString()"` |
| `stop-color=(numeric string)`| (changed, warning)| `"42"` |
| `stop-color=(-1)`| (changed, warning)| `"-1"` |
| `stop-color=(0)`| (changed, warning)| `"0"` |
| `stop-color=(integer)`| (changed, warning)| `"1"` |
| `stop-color=(NaN)`| (changed, warning)| `"NaN"` |
| `stop-color=(float)`| (changed, warning)| `"99.99"` |
| `stop-color=(true)`| (initial, warning)| `<null>` |
| `stop-color=(false)`| (initial, warning)| `<null>` |
| `stop-color=(string 'true')`| (changed, warning)| `"true"` |
| `stop-color=(string 'false')`| (changed, warning)| `"false"` |
| `stop-color=(string 'on')`| (changed, warning)| `"on"` |
| `stop-color=(string 'off')`| (changed, warning)| `"off"` |
| `stop-color=(symbol)`| (initial, warning)| `<null>` |
| `stop-color=(function)`| (initial, warning)| `<null>` |
| `stop-color=(null)`| (initial, warning)| `<null>` |
| `stop-color=(undefined)`| (initial, warning)| `<null>` |

## `stop-opacity` (on `<stop>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stop-opacity=(string)`| (changed, warning)| `"a string"` |
| `stop-opacity=(empty string)`| (changed, warning)| `<empty string>` |
| `stop-opacity=(array with string)`| (changed, warning)| `"string"` |
| `stop-opacity=(empty array)`| (changed, warning)| `<empty string>` |
| `stop-opacity=(object)`| (changed, warning)| `"result of toString()"` |
| `stop-opacity=(numeric string)`| (changed, warning)| `"42"` |
| `stop-opacity=(-1)`| (changed, warning)| `"-1"` |
| `stop-opacity=(0)`| (changed, warning)| `"0"` |
| `stop-opacity=(integer)`| (changed, warning)| `"1"` |
| `stop-opacity=(NaN)`| (changed, warning)| `"NaN"` |
| `stop-opacity=(float)`| (changed, warning)| `"99.99"` |
| `stop-opacity=(true)`| (initial, warning)| `<null>` |
| `stop-opacity=(false)`| (initial, warning)| `<null>` |
| `stop-opacity=(string 'true')`| (changed, warning)| `"true"` |
| `stop-opacity=(string 'false')`| (changed, warning)| `"false"` |
| `stop-opacity=(string 'on')`| (changed, warning)| `"on"` |
| `stop-opacity=(string 'off')`| (changed, warning)| `"off"` |
| `stop-opacity=(symbol)`| (initial, warning)| `<null>` |
| `stop-opacity=(function)`| (initial, warning)| `<null>` |
| `stop-opacity=(null)`| (initial, warning)| `<null>` |
| `stop-opacity=(undefined)`| (initial, warning)| `<null>` |

## `stopColor` (on `<stop>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stopColor=(string)`| (changed)| `"a string"` |
| `stopColor=(empty string)`| (changed)| `<empty string>` |
| `stopColor=(array with string)`| (changed)| `"string"` |
| `stopColor=(empty array)`| (changed)| `<empty string>` |
| `stopColor=(object)`| (changed)| `"result of toString()"` |
| `stopColor=(numeric string)`| (changed)| `"42"` |
| `stopColor=(-1)`| (changed)| `"-1"` |
| `stopColor=(0)`| (changed)| `"0"` |
| `stopColor=(integer)`| (changed)| `"1"` |
| `stopColor=(NaN)`| (changed, warning)| `"NaN"` |
| `stopColor=(float)`| (changed)| `"99.99"` |
| `stopColor=(true)`| (initial, warning)| `<null>` |
| `stopColor=(false)`| (initial, warning)| `<null>` |
| `stopColor=(string 'true')`| (changed)| `"true"` |
| `stopColor=(string 'false')`| (changed)| `"false"` |
| `stopColor=(string 'on')`| (changed)| `"on"` |
| `stopColor=(string 'off')`| (changed)| `"off"` |
| `stopColor=(symbol)`| (initial, warning)| `<null>` |
| `stopColor=(function)`| (initial, warning)| `<null>` |
| `stopColor=(null)`| (initial)| `<null>` |
| `stopColor=(undefined)`| (initial)| `<null>` |

## `stopOpacity` (on `<stop>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stopOpacity=(string)`| (changed)| `"a string"` |
| `stopOpacity=(empty string)`| (changed)| `<empty string>` |
| `stopOpacity=(array with string)`| (changed)| `"string"` |
| `stopOpacity=(empty array)`| (changed)| `<empty string>` |
| `stopOpacity=(object)`| (changed)| `"result of toString()"` |
| `stopOpacity=(numeric string)`| (changed)| `"42"` |
| `stopOpacity=(-1)`| (changed)| `"-1"` |
| `stopOpacity=(0)`| (changed)| `"0"` |
| `stopOpacity=(integer)`| (changed)| `"1"` |
| `stopOpacity=(NaN)`| (changed, warning)| `"NaN"` |
| `stopOpacity=(float)`| (changed)| `"99.99"` |
| `stopOpacity=(true)`| (initial, warning)| `<null>` |
| `stopOpacity=(false)`| (initial, warning)| `<null>` |
| `stopOpacity=(string 'true')`| (changed)| `"true"` |
| `stopOpacity=(string 'false')`| (changed)| `"false"` |
| `stopOpacity=(string 'on')`| (changed)| `"on"` |
| `stopOpacity=(string 'off')`| (changed)| `"off"` |
| `stopOpacity=(symbol)`| (initial, warning)| `<null>` |
| `stopOpacity=(function)`| (initial, warning)| `<null>` |
| `stopOpacity=(null)`| (initial)| `<null>` |
| `stopOpacity=(undefined)`| (initial)| `<null>` |

## `strikethrough-position` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `strikethrough-position=(string)`| (changed, warning)| `"a string"` |
| `strikethrough-position=(empty string)`| (changed, warning)| `<empty string>` |
| `strikethrough-position=(array with string)`| (changed, warning)| `"string"` |
| `strikethrough-position=(empty array)`| (changed, warning)| `<empty string>` |
| `strikethrough-position=(object)`| (changed, warning)| `"result of toString()"` |
| `strikethrough-position=(numeric string)`| (changed, warning)| `"42"` |
| `strikethrough-position=(-1)`| (changed, warning)| `"-1"` |
| `strikethrough-position=(0)`| (changed, warning)| `"0"` |
| `strikethrough-position=(integer)`| (changed, warning)| `"1"` |
| `strikethrough-position=(NaN)`| (changed, warning)| `"NaN"` |
| `strikethrough-position=(float)`| (changed, warning)| `"99.99"` |
| `strikethrough-position=(true)`| (initial, warning)| `<null>` |
| `strikethrough-position=(false)`| (initial, warning)| `<null>` |
| `strikethrough-position=(string 'true')`| (changed, warning)| `"true"` |
| `strikethrough-position=(string 'false')`| (changed, warning)| `"false"` |
| `strikethrough-position=(string 'on')`| (changed, warning)| `"on"` |
| `strikethrough-position=(string 'off')`| (changed, warning)| `"off"` |
| `strikethrough-position=(symbol)`| (initial, warning)| `<null>` |
| `strikethrough-position=(function)`| (initial, warning)| `<null>` |
| `strikethrough-position=(null)`| (initial, warning)| `<null>` |
| `strikethrough-position=(undefined)`| (initial, warning)| `<null>` |

## `strikethrough-thickness` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `strikethrough-thickness=(string)`| (changed, warning)| `"a string"` |
| `strikethrough-thickness=(empty string)`| (changed, warning)| `<empty string>` |
| `strikethrough-thickness=(array with string)`| (changed, warning)| `"string"` |
| `strikethrough-thickness=(empty array)`| (changed, warning)| `<empty string>` |
| `strikethrough-thickness=(object)`| (changed, warning)| `"result of toString()"` |
| `strikethrough-thickness=(numeric string)`| (changed, warning)| `"42"` |
| `strikethrough-thickness=(-1)`| (changed, warning)| `"-1"` |
| `strikethrough-thickness=(0)`| (changed, warning)| `"0"` |
| `strikethrough-thickness=(integer)`| (changed, warning)| `"1"` |
| `strikethrough-thickness=(NaN)`| (changed, warning)| `"NaN"` |
| `strikethrough-thickness=(float)`| (changed, warning)| `"99.99"` |
| `strikethrough-thickness=(true)`| (initial, warning)| `<null>` |
| `strikethrough-thickness=(false)`| (initial, warning)| `<null>` |
| `strikethrough-thickness=(string 'true')`| (changed, warning)| `"true"` |
| `strikethrough-thickness=(string 'false')`| (changed, warning)| `"false"` |
| `strikethrough-thickness=(string 'on')`| (changed, warning)| `"on"` |
| `strikethrough-thickness=(string 'off')`| (changed, warning)| `"off"` |
| `strikethrough-thickness=(symbol)`| (initial, warning)| `<null>` |
| `strikethrough-thickness=(function)`| (initial, warning)| `<null>` |
| `strikethrough-thickness=(null)`| (initial, warning)| `<null>` |
| `strikethrough-thickness=(undefined)`| (initial, warning)| `<null>` |

## `strikethroughPosition` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `strikethroughPosition=(string)`| (changed)| `"a string"` |
| `strikethroughPosition=(empty string)`| (changed)| `<empty string>` |
| `strikethroughPosition=(array with string)`| (changed)| `"string"` |
| `strikethroughPosition=(empty array)`| (changed)| `<empty string>` |
| `strikethroughPosition=(object)`| (changed)| `"result of toString()"` |
| `strikethroughPosition=(numeric string)`| (changed)| `"42"` |
| `strikethroughPosition=(-1)`| (changed)| `"-1"` |
| `strikethroughPosition=(0)`| (changed)| `"0"` |
| `strikethroughPosition=(integer)`| (changed)| `"1"` |
| `strikethroughPosition=(NaN)`| (changed, warning)| `"NaN"` |
| `strikethroughPosition=(float)`| (changed)| `"99.99"` |
| `strikethroughPosition=(true)`| (initial, warning)| `<null>` |
| `strikethroughPosition=(false)`| (initial, warning)| `<null>` |
| `strikethroughPosition=(string 'true')`| (changed)| `"true"` |
| `strikethroughPosition=(string 'false')`| (changed)| `"false"` |
| `strikethroughPosition=(string 'on')`| (changed)| `"on"` |
| `strikethroughPosition=(string 'off')`| (changed)| `"off"` |
| `strikethroughPosition=(symbol)`| (initial, warning)| `<null>` |
| `strikethroughPosition=(function)`| (initial, warning)| `<null>` |
| `strikethroughPosition=(null)`| (initial)| `<null>` |
| `strikethroughPosition=(undefined)`| (initial)| `<null>` |

## `strikethroughThickness` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `strikethroughThickness=(string)`| (changed)| `"a string"` |
| `strikethroughThickness=(empty string)`| (changed)| `<empty string>` |
| `strikethroughThickness=(array with string)`| (changed)| `"string"` |
| `strikethroughThickness=(empty array)`| (changed)| `<empty string>` |
| `strikethroughThickness=(object)`| (changed)| `"result of toString()"` |
| `strikethroughThickness=(numeric string)`| (changed)| `"42"` |
| `strikethroughThickness=(-1)`| (changed)| `"-1"` |
| `strikethroughThickness=(0)`| (changed)| `"0"` |
| `strikethroughThickness=(integer)`| (changed)| `"1"` |
| `strikethroughThickness=(NaN)`| (changed, warning)| `"NaN"` |
| `strikethroughThickness=(float)`| (changed)| `"99.99"` |
| `strikethroughThickness=(true)`| (initial, warning)| `<null>` |
| `strikethroughThickness=(false)`| (initial, warning)| `<null>` |
| `strikethroughThickness=(string 'true')`| (changed)| `"true"` |
| `strikethroughThickness=(string 'false')`| (changed)| `"false"` |
| `strikethroughThickness=(string 'on')`| (changed)| `"on"` |
| `strikethroughThickness=(string 'off')`| (changed)| `"off"` |
| `strikethroughThickness=(symbol)`| (initial, warning)| `<null>` |
| `strikethroughThickness=(function)`| (initial, warning)| `<null>` |
| `strikethroughThickness=(null)`| (initial)| `<null>` |
| `strikethroughThickness=(undefined)`| (initial)| `<null>` |

## `string` (on `<font-face-format>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `string=(string)`| (changed)| `"a string"` |
| `string=(empty string)`| (changed)| `<empty string>` |
| `string=(array with string)`| (changed)| `"string"` |
| `string=(empty array)`| (changed)| `<empty string>` |
| `string=(object)`| (changed)| `"result of toString()"` |
| `string=(numeric string)`| (changed)| `"42"` |
| `string=(-1)`| (changed)| `"-1"` |
| `string=(0)`| (changed)| `"0"` |
| `string=(integer)`| (changed)| `"1"` |
| `string=(NaN)`| (changed, warning)| `"NaN"` |
| `string=(float)`| (changed)| `"99.99"` |
| `string=(true)`| (initial, warning)| `<null>` |
| `string=(false)`| (initial, warning)| `<null>` |
| `string=(string 'true')`| (changed)| `"true"` |
| `string=(string 'false')`| (changed)| `"false"` |
| `string=(string 'on')`| (changed)| `"on"` |
| `string=(string 'off')`| (changed)| `"off"` |
| `string=(symbol)`| (initial, warning)| `<null>` |
| `string=(function)`| (initial, warning)| `<null>` |
| `string=(null)`| (initial)| `<null>` |
| `string=(undefined)`| (initial)| `<null>` |

## `stroke` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stroke=(string)`| (changed)| `"a string"` |
| `stroke=(empty string)`| (changed)| `<empty string>` |
| `stroke=(array with string)`| (changed)| `"string"` |
| `stroke=(empty array)`| (changed)| `<empty string>` |
| `stroke=(object)`| (changed)| `"result of toString()"` |
| `stroke=(numeric string)`| (changed)| `"42"` |
| `stroke=(-1)`| (changed)| `"-1"` |
| `stroke=(0)`| (changed)| `"0"` |
| `stroke=(integer)`| (changed)| `"1"` |
| `stroke=(NaN)`| (changed, warning)| `"NaN"` |
| `stroke=(float)`| (changed)| `"99.99"` |
| `stroke=(true)`| (initial, warning)| `<null>` |
| `stroke=(false)`| (initial, warning)| `<null>` |
| `stroke=(string 'true')`| (changed)| `"true"` |
| `stroke=(string 'false')`| (changed)| `"false"` |
| `stroke=(string 'on')`| (changed)| `"on"` |
| `stroke=(string 'off')`| (changed)| `"off"` |
| `stroke=(symbol)`| (initial, warning)| `<null>` |
| `stroke=(function)`| (initial, warning)| `<null>` |
| `stroke=(null)`| (initial)| `<null>` |
| `stroke=(undefined)`| (initial)| `<null>` |

## `stroke-dasharray` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stroke-dasharray=(string)`| (changed, warning)| `"a string"` |
| `stroke-dasharray=(empty string)`| (changed, warning)| `<empty string>` |
| `stroke-dasharray=(array with string)`| (changed, warning)| `"string"` |
| `stroke-dasharray=(empty array)`| (changed, warning)| `<empty string>` |
| `stroke-dasharray=(object)`| (changed, warning)| `"result of toString()"` |
| `stroke-dasharray=(numeric string)`| (changed, warning)| `"42"` |
| `stroke-dasharray=(-1)`| (changed, warning)| `"-1"` |
| `stroke-dasharray=(0)`| (changed, warning)| `"0"` |
| `stroke-dasharray=(integer)`| (changed, warning)| `"1"` |
| `stroke-dasharray=(NaN)`| (changed, warning)| `"NaN"` |
| `stroke-dasharray=(float)`| (changed, warning)| `"99.99"` |
| `stroke-dasharray=(true)`| (initial, warning)| `<null>` |
| `stroke-dasharray=(false)`| (initial, warning)| `<null>` |
| `stroke-dasharray=(string 'true')`| (changed, warning)| `"true"` |
| `stroke-dasharray=(string 'false')`| (changed, warning)| `"false"` |
| `stroke-dasharray=(string 'on')`| (changed, warning)| `"on"` |
| `stroke-dasharray=(string 'off')`| (changed, warning)| `"off"` |
| `stroke-dasharray=(symbol)`| (initial, warning)| `<null>` |
| `stroke-dasharray=(function)`| (initial, warning)| `<null>` |
| `stroke-dasharray=(null)`| (initial, warning)| `<null>` |
| `stroke-dasharray=(undefined)`| (initial, warning)| `<null>` |

## `stroke-Dasharray` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stroke-Dasharray=(string)`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(empty string)`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(array with string)`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(empty array)`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(object)`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(numeric string)`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(-1)`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(0)`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(integer)`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(NaN)`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(float)`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(true)`| (initial, warning)| `<null>` |
| `stroke-Dasharray=(false)`| (initial, warning)| `<null>` |
| `stroke-Dasharray=(string 'true')`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(string 'false')`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(string 'on')`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(string 'off')`| (initial, warning, ssr mismatch)| `<null>` |
| `stroke-Dasharray=(symbol)`| (initial, warning)| `<null>` |
| `stroke-Dasharray=(function)`| (initial, warning)| `<null>` |
| `stroke-Dasharray=(null)`| (initial, warning)| `<null>` |
| `stroke-Dasharray=(undefined)`| (initial, warning)| `<null>` |

## `stroke-dashoffset` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stroke-dashoffset=(string)`| (changed, warning)| `"a string"` |
| `stroke-dashoffset=(empty string)`| (changed, warning)| `<empty string>` |
| `stroke-dashoffset=(array with string)`| (changed, warning)| `"string"` |
| `stroke-dashoffset=(empty array)`| (changed, warning)| `<empty string>` |
| `stroke-dashoffset=(object)`| (changed, warning)| `"result of toString()"` |
| `stroke-dashoffset=(numeric string)`| (changed, warning)| `"42"` |
| `stroke-dashoffset=(-1)`| (changed, warning)| `"-1"` |
| `stroke-dashoffset=(0)`| (changed, warning)| `"0"` |
| `stroke-dashoffset=(integer)`| (changed, warning)| `"1"` |
| `stroke-dashoffset=(NaN)`| (changed, warning)| `"NaN"` |
| `stroke-dashoffset=(float)`| (changed, warning)| `"99.99"` |
| `stroke-dashoffset=(true)`| (initial, warning)| `<null>` |
| `stroke-dashoffset=(false)`| (initial, warning)| `<null>` |
| `stroke-dashoffset=(string 'true')`| (changed, warning)| `"true"` |
| `stroke-dashoffset=(string 'false')`| (changed, warning)| `"false"` |
| `stroke-dashoffset=(string 'on')`| (changed, warning)| `"on"` |
| `stroke-dashoffset=(string 'off')`| (changed, warning)| `"off"` |
| `stroke-dashoffset=(symbol)`| (initial, warning)| `<null>` |
| `stroke-dashoffset=(function)`| (initial, warning)| `<null>` |
| `stroke-dashoffset=(null)`| (initial, warning)| `<null>` |
| `stroke-dashoffset=(undefined)`| (initial, warning)| `<null>` |

## `stroke-linecap` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stroke-linecap=(string)`| (changed, warning)| `"a string"` |
| `stroke-linecap=(empty string)`| (changed, warning)| `<empty string>` |
| `stroke-linecap=(array with string)`| (changed, warning)| `"string"` |
| `stroke-linecap=(empty array)`| (changed, warning)| `<empty string>` |
| `stroke-linecap=(object)`| (changed, warning)| `"result of toString()"` |
| `stroke-linecap=(numeric string)`| (changed, warning)| `"42"` |
| `stroke-linecap=(-1)`| (changed, warning)| `"-1"` |
| `stroke-linecap=(0)`| (changed, warning)| `"0"` |
| `stroke-linecap=(integer)`| (changed, warning)| `"1"` |
| `stroke-linecap=(NaN)`| (changed, warning)| `"NaN"` |
| `stroke-linecap=(float)`| (changed, warning)| `"99.99"` |
| `stroke-linecap=(true)`| (initial, warning)| `<null>` |
| `stroke-linecap=(false)`| (initial, warning)| `<null>` |
| `stroke-linecap=(string 'true')`| (changed, warning)| `"true"` |
| `stroke-linecap=(string 'false')`| (changed, warning)| `"false"` |
| `stroke-linecap=(string 'on')`| (changed, warning)| `"on"` |
| `stroke-linecap=(string 'off')`| (changed, warning)| `"off"` |
| `stroke-linecap=(symbol)`| (initial, warning)| `<null>` |
| `stroke-linecap=(function)`| (initial, warning)| `<null>` |
| `stroke-linecap=(null)`| (initial, warning)| `<null>` |
| `stroke-linecap=(undefined)`| (initial, warning)| `<null>` |

## `stroke-linejoin` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stroke-linejoin=(string)`| (changed, warning)| `"a string"` |
| `stroke-linejoin=(empty string)`| (changed, warning)| `<empty string>` |
| `stroke-linejoin=(array with string)`| (changed, warning)| `"string"` |
| `stroke-linejoin=(empty array)`| (changed, warning)| `<empty string>` |
| `stroke-linejoin=(object)`| (changed, warning)| `"result of toString()"` |
| `stroke-linejoin=(numeric string)`| (changed, warning)| `"42"` |
| `stroke-linejoin=(-1)`| (changed, warning)| `"-1"` |
| `stroke-linejoin=(0)`| (changed, warning)| `"0"` |
| `stroke-linejoin=(integer)`| (changed, warning)| `"1"` |
| `stroke-linejoin=(NaN)`| (changed, warning)| `"NaN"` |
| `stroke-linejoin=(float)`| (changed, warning)| `"99.99"` |
| `stroke-linejoin=(true)`| (initial, warning)| `<null>` |
| `stroke-linejoin=(false)`| (initial, warning)| `<null>` |
| `stroke-linejoin=(string 'true')`| (changed, warning)| `"true"` |
| `stroke-linejoin=(string 'false')`| (changed, warning)| `"false"` |
| `stroke-linejoin=(string 'on')`| (changed, warning)| `"on"` |
| `stroke-linejoin=(string 'off')`| (changed, warning)| `"off"` |
| `stroke-linejoin=(symbol)`| (initial, warning)| `<null>` |
| `stroke-linejoin=(function)`| (initial, warning)| `<null>` |
| `stroke-linejoin=(null)`| (initial, warning)| `<null>` |
| `stroke-linejoin=(undefined)`| (initial, warning)| `<null>` |

## `stroke-miterlimit` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stroke-miterlimit=(string)`| (changed, warning)| `"a string"` |
| `stroke-miterlimit=(empty string)`| (changed, warning)| `<empty string>` |
| `stroke-miterlimit=(array with string)`| (changed, warning)| `"string"` |
| `stroke-miterlimit=(empty array)`| (changed, warning)| `<empty string>` |
| `stroke-miterlimit=(object)`| (changed, warning)| `"result of toString()"` |
| `stroke-miterlimit=(numeric string)`| (changed, warning)| `"42"` |
| `stroke-miterlimit=(-1)`| (changed, warning)| `"-1"` |
| `stroke-miterlimit=(0)`| (changed, warning)| `"0"` |
| `stroke-miterlimit=(integer)`| (changed, warning)| `"1"` |
| `stroke-miterlimit=(NaN)`| (changed, warning)| `"NaN"` |
| `stroke-miterlimit=(float)`| (changed, warning)| `"99.99"` |
| `stroke-miterlimit=(true)`| (initial, warning)| `<null>` |
| `stroke-miterlimit=(false)`| (initial, warning)| `<null>` |
| `stroke-miterlimit=(string 'true')`| (changed, warning)| `"true"` |
| `stroke-miterlimit=(string 'false')`| (changed, warning)| `"false"` |
| `stroke-miterlimit=(string 'on')`| (changed, warning)| `"on"` |
| `stroke-miterlimit=(string 'off')`| (changed, warning)| `"off"` |
| `stroke-miterlimit=(symbol)`| (initial, warning)| `<null>` |
| `stroke-miterlimit=(function)`| (initial, warning)| `<null>` |
| `stroke-miterlimit=(null)`| (initial, warning)| `<null>` |
| `stroke-miterlimit=(undefined)`| (initial, warning)| `<null>` |

## `stroke-opacity` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stroke-opacity=(string)`| (changed, warning)| `"a string"` |
| `stroke-opacity=(empty string)`| (changed, warning)| `<empty string>` |
| `stroke-opacity=(array with string)`| (changed, warning)| `"string"` |
| `stroke-opacity=(empty array)`| (changed, warning)| `<empty string>` |
| `stroke-opacity=(object)`| (changed, warning)| `"result of toString()"` |
| `stroke-opacity=(numeric string)`| (changed, warning)| `"42"` |
| `stroke-opacity=(-1)`| (changed, warning)| `"-1"` |
| `stroke-opacity=(0)`| (changed, warning)| `"0"` |
| `stroke-opacity=(integer)`| (changed, warning)| `"1"` |
| `stroke-opacity=(NaN)`| (changed, warning)| `"NaN"` |
| `stroke-opacity=(float)`| (changed, warning)| `"99.99"` |
| `stroke-opacity=(true)`| (initial, warning)| `<null>` |
| `stroke-opacity=(false)`| (initial, warning)| `<null>` |
| `stroke-opacity=(string 'true')`| (changed, warning)| `"true"` |
| `stroke-opacity=(string 'false')`| (changed, warning)| `"false"` |
| `stroke-opacity=(string 'on')`| (changed, warning)| `"on"` |
| `stroke-opacity=(string 'off')`| (changed, warning)| `"off"` |
| `stroke-opacity=(symbol)`| (initial, warning)| `<null>` |
| `stroke-opacity=(function)`| (initial, warning)| `<null>` |
| `stroke-opacity=(null)`| (initial, warning)| `<null>` |
| `stroke-opacity=(undefined)`| (initial, warning)| `<null>` |

## `stroke-width` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `stroke-width=(string)`| (changed, warning)| `"a string"` |
| `stroke-width=(empty string)`| (changed, warning)| `<empty string>` |
| `stroke-width=(array with string)`| (changed, warning)| `"string"` |
| `stroke-width=(empty array)`| (changed, warning)| `<empty string>` |
| `stroke-width=(object)`| (changed, warning)| `"result of toString()"` |
| `stroke-width=(numeric string)`| (changed, warning)| `"42"` |
| `stroke-width=(-1)`| (changed, warning)| `"-1"` |
| `stroke-width=(0)`| (changed, warning)| `"0"` |
| `stroke-width=(integer)`| (changed, warning)| `"1"` |
| `stroke-width=(NaN)`| (changed, warning)| `"NaN"` |
| `stroke-width=(float)`| (changed, warning)| `"99.99"` |
| `stroke-width=(true)`| (initial, warning)| `<null>` |
| `stroke-width=(false)`| (initial, warning)| `<null>` |
| `stroke-width=(string 'true')`| (changed, warning)| `"true"` |
| `stroke-width=(string 'false')`| (changed, warning)| `"false"` |
| `stroke-width=(string 'on')`| (changed, warning)| `"on"` |
| `stroke-width=(string 'off')`| (changed, warning)| `"off"` |
| `stroke-width=(symbol)`| (initial, warning)| `<null>` |
| `stroke-width=(function)`| (initial, warning)| `<null>` |
| `stroke-width=(null)`| (initial, warning)| `<null>` |
| `stroke-width=(undefined)`| (initial, warning)| `<null>` |

## `strokeDasharray` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `strokeDasharray=(string)`| (changed)| `"a string"` |
| `strokeDasharray=(empty string)`| (changed)| `<empty string>` |
| `strokeDasharray=(array with string)`| (changed)| `"string"` |
| `strokeDasharray=(empty array)`| (changed)| `<empty string>` |
| `strokeDasharray=(object)`| (changed)| `"result of toString()"` |
| `strokeDasharray=(numeric string)`| (changed)| `"42"` |
| `strokeDasharray=(-1)`| (changed)| `"-1"` |
| `strokeDasharray=(0)`| (changed)| `"0"` |
| `strokeDasharray=(integer)`| (changed)| `"1"` |
| `strokeDasharray=(NaN)`| (changed, warning)| `"NaN"` |
| `strokeDasharray=(float)`| (changed)| `"99.99"` |
| `strokeDasharray=(true)`| (initial, warning)| `<null>` |
| `strokeDasharray=(false)`| (initial, warning)| `<null>` |
| `strokeDasharray=(string 'true')`| (changed)| `"true"` |
| `strokeDasharray=(string 'false')`| (changed)| `"false"` |
| `strokeDasharray=(string 'on')`| (changed)| `"on"` |
| `strokeDasharray=(string 'off')`| (changed)| `"off"` |
| `strokeDasharray=(symbol)`| (initial, warning)| `<null>` |
| `strokeDasharray=(function)`| (initial, warning)| `<null>` |
| `strokeDasharray=(null)`| (initial)| `<null>` |
| `strokeDasharray=(undefined)`| (initial)| `<null>` |

## `strokeDashoffset` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `strokeDashoffset=(string)`| (changed)| `"a string"` |
| `strokeDashoffset=(empty string)`| (changed)| `<empty string>` |
| `strokeDashoffset=(array with string)`| (changed)| `"string"` |
| `strokeDashoffset=(empty array)`| (changed)| `<empty string>` |
| `strokeDashoffset=(object)`| (changed)| `"result of toString()"` |
| `strokeDashoffset=(numeric string)`| (changed)| `"42"` |
| `strokeDashoffset=(-1)`| (changed)| `"-1"` |
| `strokeDashoffset=(0)`| (changed)| `"0"` |
| `strokeDashoffset=(integer)`| (changed)| `"1"` |
| `strokeDashoffset=(NaN)`| (changed, warning)| `"NaN"` |
| `strokeDashoffset=(float)`| (changed)| `"99.99"` |
| `strokeDashoffset=(true)`| (initial, warning)| `<null>` |
| `strokeDashoffset=(false)`| (initial, warning)| `<null>` |
| `strokeDashoffset=(string 'true')`| (changed)| `"true"` |
| `strokeDashoffset=(string 'false')`| (changed)| `"false"` |
| `strokeDashoffset=(string 'on')`| (changed)| `"on"` |
| `strokeDashoffset=(string 'off')`| (changed)| `"off"` |
| `strokeDashoffset=(symbol)`| (initial, warning)| `<null>` |
| `strokeDashoffset=(function)`| (initial, warning)| `<null>` |
| `strokeDashoffset=(null)`| (initial)| `<null>` |
| `strokeDashoffset=(undefined)`| (initial)| `<null>` |

## `strokeLinecap` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `strokeLinecap=(string)`| (changed)| `"a string"` |
| `strokeLinecap=(empty string)`| (changed)| `<empty string>` |
| `strokeLinecap=(array with string)`| (changed)| `"string"` |
| `strokeLinecap=(empty array)`| (changed)| `<empty string>` |
| `strokeLinecap=(object)`| (changed)| `"result of toString()"` |
| `strokeLinecap=(numeric string)`| (changed)| `"42"` |
| `strokeLinecap=(-1)`| (changed)| `"-1"` |
| `strokeLinecap=(0)`| (changed)| `"0"` |
| `strokeLinecap=(integer)`| (changed)| `"1"` |
| `strokeLinecap=(NaN)`| (changed, warning)| `"NaN"` |
| `strokeLinecap=(float)`| (changed)| `"99.99"` |
| `strokeLinecap=(true)`| (initial, warning)| `<null>` |
| `strokeLinecap=(false)`| (initial, warning)| `<null>` |
| `strokeLinecap=(string 'true')`| (changed)| `"true"` |
| `strokeLinecap=(string 'false')`| (changed)| `"false"` |
| `strokeLinecap=(string 'on')`| (changed)| `"on"` |
| `strokeLinecap=(string 'off')`| (changed)| `"off"` |
| `strokeLinecap=(symbol)`| (initial, warning)| `<null>` |
| `strokeLinecap=(function)`| (initial, warning)| `<null>` |
| `strokeLinecap=(null)`| (initial)| `<null>` |
| `strokeLinecap=(undefined)`| (initial)| `<null>` |

## `strokeLinejoin` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `strokeLinejoin=(string)`| (changed)| `"a string"` |
| `strokeLinejoin=(empty string)`| (changed)| `<empty string>` |
| `strokeLinejoin=(array with string)`| (changed)| `"string"` |
| `strokeLinejoin=(empty array)`| (changed)| `<empty string>` |
| `strokeLinejoin=(object)`| (changed)| `"result of toString()"` |
| `strokeLinejoin=(numeric string)`| (changed)| `"42"` |
| `strokeLinejoin=(-1)`| (changed)| `"-1"` |
| `strokeLinejoin=(0)`| (changed)| `"0"` |
| `strokeLinejoin=(integer)`| (changed)| `"1"` |
| `strokeLinejoin=(NaN)`| (changed, warning)| `"NaN"` |
| `strokeLinejoin=(float)`| (changed)| `"99.99"` |
| `strokeLinejoin=(true)`| (initial, warning)| `<null>` |
| `strokeLinejoin=(false)`| (initial, warning)| `<null>` |
| `strokeLinejoin=(string 'true')`| (changed)| `"true"` |
| `strokeLinejoin=(string 'false')`| (changed)| `"false"` |
| `strokeLinejoin=(string 'on')`| (changed)| `"on"` |
| `strokeLinejoin=(string 'off')`| (changed)| `"off"` |
| `strokeLinejoin=(symbol)`| (initial, warning)| `<null>` |
| `strokeLinejoin=(function)`| (initial, warning)| `<null>` |
| `strokeLinejoin=(null)`| (initial)| `<null>` |
| `strokeLinejoin=(undefined)`| (initial)| `<null>` |

## `strokeMiterlimit` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `strokeMiterlimit=(string)`| (changed)| `"a string"` |
| `strokeMiterlimit=(empty string)`| (changed)| `<empty string>` |
| `strokeMiterlimit=(array with string)`| (changed)| `"string"` |
| `strokeMiterlimit=(empty array)`| (changed)| `<empty string>` |
| `strokeMiterlimit=(object)`| (changed)| `"result of toString()"` |
| `strokeMiterlimit=(numeric string)`| (changed)| `"42"` |
| `strokeMiterlimit=(-1)`| (changed)| `"-1"` |
| `strokeMiterlimit=(0)`| (changed)| `"0"` |
| `strokeMiterlimit=(integer)`| (changed)| `"1"` |
| `strokeMiterlimit=(NaN)`| (changed, warning)| `"NaN"` |
| `strokeMiterlimit=(float)`| (changed)| `"99.99"` |
| `strokeMiterlimit=(true)`| (initial, warning)| `<null>` |
| `strokeMiterlimit=(false)`| (initial, warning)| `<null>` |
| `strokeMiterlimit=(string 'true')`| (changed)| `"true"` |
| `strokeMiterlimit=(string 'false')`| (changed)| `"false"` |
| `strokeMiterlimit=(string 'on')`| (changed)| `"on"` |
| `strokeMiterlimit=(string 'off')`| (changed)| `"off"` |
| `strokeMiterlimit=(symbol)`| (initial, warning)| `<null>` |
| `strokeMiterlimit=(function)`| (initial, warning)| `<null>` |
| `strokeMiterlimit=(null)`| (initial)| `<null>` |
| `strokeMiterlimit=(undefined)`| (initial)| `<null>` |

## `strokeOpacity` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `strokeOpacity=(string)`| (changed)| `"a string"` |
| `strokeOpacity=(empty string)`| (changed)| `<empty string>` |
| `strokeOpacity=(array with string)`| (changed)| `"string"` |
| `strokeOpacity=(empty array)`| (changed)| `<empty string>` |
| `strokeOpacity=(object)`| (changed)| `"result of toString()"` |
| `strokeOpacity=(numeric string)`| (changed)| `"42"` |
| `strokeOpacity=(-1)`| (changed)| `"-1"` |
| `strokeOpacity=(0)`| (changed)| `"0"` |
| `strokeOpacity=(integer)`| (changed)| `"1"` |
| `strokeOpacity=(NaN)`| (changed, warning)| `"NaN"` |
| `strokeOpacity=(float)`| (changed)| `"99.99"` |
| `strokeOpacity=(true)`| (initial, warning)| `<null>` |
| `strokeOpacity=(false)`| (initial, warning)| `<null>` |
| `strokeOpacity=(string 'true')`| (changed)| `"true"` |
| `strokeOpacity=(string 'false')`| (changed)| `"false"` |
| `strokeOpacity=(string 'on')`| (changed)| `"on"` |
| `strokeOpacity=(string 'off')`| (changed)| `"off"` |
| `strokeOpacity=(symbol)`| (initial, warning)| `<null>` |
| `strokeOpacity=(function)`| (initial, warning)| `<null>` |
| `strokeOpacity=(null)`| (initial)| `<null>` |
| `strokeOpacity=(undefined)`| (initial)| `<null>` |

## `strokeWidth` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `strokeWidth=(string)`| (changed)| `"a string"` |
| `strokeWidth=(empty string)`| (changed)| `<empty string>` |
| `strokeWidth=(array with string)`| (changed)| `"string"` |
| `strokeWidth=(empty array)`| (changed)| `<empty string>` |
| `strokeWidth=(object)`| (changed)| `"result of toString()"` |
| `strokeWidth=(numeric string)`| (changed)| `"42"` |
| `strokeWidth=(-1)`| (changed)| `"-1"` |
| `strokeWidth=(0)`| (changed)| `"0"` |
| `strokeWidth=(integer)`| (changed)| `"1"` |
| `strokeWidth=(NaN)`| (changed, warning)| `"NaN"` |
| `strokeWidth=(float)`| (changed)| `"99.99"` |
| `strokeWidth=(true)`| (initial, warning)| `<null>` |
| `strokeWidth=(false)`| (initial, warning)| `<null>` |
| `strokeWidth=(string 'true')`| (changed)| `"true"` |
| `strokeWidth=(string 'false')`| (changed)| `"false"` |
| `strokeWidth=(string 'on')`| (changed)| `"on"` |
| `strokeWidth=(string 'off')`| (changed)| `"off"` |
| `strokeWidth=(symbol)`| (initial, warning)| `<null>` |
| `strokeWidth=(function)`| (initial, warning)| `<null>` |
| `strokeWidth=(null)`| (initial)| `<null>` |
| `strokeWidth=(undefined)`| (initial)| `<null>` |

## `style` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `style=(string)`| (changed, error, warning, ssr error)| `` |
| `style=(empty string)`| (changed, error, warning, ssr error)| `` |
| `style=(array with string)`| (changed, error, warning, ssr mismatch)| `` |
| `style=(empty array)`| (initial)| `[]` |
| `style=(object)`| (initial)| `[]` |
| `style=(numeric string)`| (changed, error, warning, ssr error)| `` |
| `style=(-1)`| (changed, error, warning, ssr error)| `` |
| `style=(0)`| (changed, error, warning, ssr error)| `` |
| `style=(integer)`| (changed, error, warning, ssr error)| `` |
| `style=(NaN)`| (changed, error, warning, ssr error)| `` |
| `style=(float)`| (changed, error, warning, ssr error)| `` |
| `style=(true)`| (changed, error, warning, ssr error)| `` |
| `style=(false)`| (changed, error, warning, ssr error)| `` |
| `style=(string 'true')`| (changed, error, warning, ssr error)| `` |
| `style=(string 'false')`| (changed, error, warning, ssr error)| `` |
| `style=(string 'on')`| (changed, error, warning, ssr error)| `` |
| `style=(string 'off')`| (changed, error, warning, ssr error)| `` |
| `style=(symbol)`| (changed, error, warning, ssr error)| `` |
| `style=(function)`| (changed, error, warning, ssr error)| `` |
| `style=(null)`| (initial)| `[]` |
| `style=(undefined)`| (initial)| `[]` |

## `summary` (on `<table>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `summary=(string)`| (changed)| `"a string"` |
| `summary=(empty string)`| (initial)| `<empty string>` |
| `summary=(array with string)`| (changed)| `"string"` |
| `summary=(empty array)`| (initial)| `<empty string>` |
| `summary=(object)`| (changed)| `"result of toString()"` |
| `summary=(numeric string)`| (changed)| `"42"` |
| `summary=(-1)`| (changed)| `"-1"` |
| `summary=(0)`| (changed)| `"0"` |
| `summary=(integer)`| (changed)| `"1"` |
| `summary=(NaN)`| (changed, warning)| `"NaN"` |
| `summary=(float)`| (changed)| `"99.99"` |
| `summary=(true)`| (initial, warning)| `<empty string>` |
| `summary=(false)`| (initial, warning)| `<empty string>` |
| `summary=(string 'true')`| (changed)| `"true"` |
| `summary=(string 'false')`| (changed)| `"false"` |
| `summary=(string 'on')`| (changed)| `"on"` |
| `summary=(string 'off')`| (changed)| `"off"` |
| `summary=(symbol)`| (initial, warning)| `<empty string>` |
| `summary=(function)`| (initial, warning)| `<empty string>` |
| `summary=(null)`| (initial)| `<empty string>` |
| `summary=(undefined)`| (initial)| `<empty string>` |

## `suppressContentEditableWarning` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `suppressContentEditableWarning=(string)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(empty string)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(array with string)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(empty array)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(object)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(numeric string)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(-1)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(0)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(integer)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(NaN)`| (initial, warning)| `<null>` |
| `suppressContentEditableWarning=(float)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(true)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(false)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(string 'true')`| (initial)| `<null>` |
| `suppressContentEditableWarning=(string 'false')`| (initial)| `<null>` |
| `suppressContentEditableWarning=(string 'on')`| (initial)| `<null>` |
| `suppressContentEditableWarning=(string 'off')`| (initial)| `<null>` |
| `suppressContentEditableWarning=(symbol)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(function)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(null)`| (initial)| `<null>` |
| `suppressContentEditableWarning=(undefined)`| (initial)| `<null>` |

## `surfaceScale` (on `<feDiffuseLighting>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `surfaceScale=(string)`| (initial)| `<number: 1>` |
| `surfaceScale=(empty string)`| (changed)| `<number: 0>` |
| `surfaceScale=(array with string)`| (initial)| `<number: 1>` |
| `surfaceScale=(empty array)`| (changed)| `<number: 0>` |
| `surfaceScale=(object)`| (initial)| `<number: 1>` |
| `surfaceScale=(numeric string)`| (changed)| `<number: 42>` |
| `surfaceScale=(-1)`| (changed)| `<number: -1>` |
| `surfaceScale=(0)`| (changed)| `<number: 0>` |
| `surfaceScale=(integer)`| (initial)| `<number: 1>` |
| `surfaceScale=(NaN)`| (initial, warning)| `<number: 1>` |
| `surfaceScale=(float)`| (changed)| `<number: 99.98999786376953>` |
| `surfaceScale=(true)`| (initial, warning)| `<number: 1>` |
| `surfaceScale=(false)`| (initial, warning)| `<number: 1>` |
| `surfaceScale=(string 'true')`| (initial)| `<number: 1>` |
| `surfaceScale=(string 'false')`| (initial)| `<number: 1>` |
| `surfaceScale=(string 'on')`| (initial)| `<number: 1>` |
| `surfaceScale=(string 'off')`| (initial)| `<number: 1>` |
| `surfaceScale=(symbol)`| (initial, warning)| `<number: 1>` |
| `surfaceScale=(function)`| (initial, warning)| `<number: 1>` |
| `surfaceScale=(null)`| (initial)| `<number: 1>` |
| `surfaceScale=(undefined)`| (initial)| `<number: 1>` |

## `systemLanguage` (on `<a>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `systemLanguage=(string)`| (changed)| `["en"]` |
| `systemLanguage=(empty string)`| (initial)| `[]` |
| `systemLanguage=(array with string)`| (changed)| `["en"]` |
| `systemLanguage=(empty array)`| (initial)| `[]` |
| `systemLanguage=(object)`| (changed)| `["result", "of", "toString()"]` |
| `systemLanguage=(numeric string)`| (changed)| `["42"]` |
| `systemLanguage=(-1)`| (changed)| `["-1"]` |
| `systemLanguage=(0)`| (changed)| `["0"]` |
| `systemLanguage=(integer)`| (changed)| `["1"]` |
| `systemLanguage=(NaN)`| (changed, warning)| `["NaN"]` |
| `systemLanguage=(float)`| (changed)| `["99.99"]` |
| `systemLanguage=(true)`| (initial, warning)| `[]` |
| `systemLanguage=(false)`| (initial, warning)| `[]` |
| `systemLanguage=(string 'true')`| (changed)| `["true"]` |
| `systemLanguage=(string 'false')`| (changed)| `["false"]` |
| `systemLanguage=(string 'on')`| (changed)| `["on"]` |
| `systemLanguage=(string 'off')`| (changed)| `["off"]` |
| `systemLanguage=(symbol)`| (initial, warning)| `[]` |
| `systemLanguage=(function)`| (initial, warning)| `[]` |
| `systemLanguage=(null)`| (initial)| `[]` |
| `systemLanguage=(undefined)`| (initial)| `[]` |

## `tabIndex` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `tabIndex=(string)`| (initial)| `<number: -1>` |
| `tabIndex=(empty string)`| (initial)| `<number: -1>` |
| `tabIndex=(array with string)`| (initial)| `<number: -1>` |
| `tabIndex=(empty array)`| (initial)| `<number: -1>` |
| `tabIndex=(object)`| (initial)| `<number: -1>` |
| `tabIndex=(numeric string)`| (changed)| `<number: 42>` |
| `tabIndex=(-1)`| (initial)| `<number: -1>` |
| `tabIndex=(0)`| (changed)| `<number: 0>` |
| `tabIndex=(integer)`| (changed)| `<number: 1>` |
| `tabIndex=(NaN)`| (initial, warning)| `<number: -1>` |
| `tabIndex=(float)`| (changed)| `<number: 99>` |
| `tabIndex=(true)`| (initial, warning)| `<number: -1>` |
| `tabIndex=(false)`| (initial, warning)| `<number: -1>` |
| `tabIndex=(string 'true')`| (initial)| `<number: -1>` |
| `tabIndex=(string 'false')`| (initial)| `<number: -1>` |
| `tabIndex=(string 'on')`| (initial)| `<number: -1>` |
| `tabIndex=(string 'off')`| (initial)| `<number: -1>` |
| `tabIndex=(symbol)`| (initial, warning)| `<number: -1>` |
| `tabIndex=(function)`| (initial, warning)| `<number: -1>` |
| `tabIndex=(null)`| (initial)| `<number: -1>` |
| `tabIndex=(undefined)`| (initial)| `<number: -1>` |

## `tabIndex` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `tabIndex=(string)`| (initial)| `<number: -1>` |
| `tabIndex=(empty string)`| (initial)| `<number: -1>` |
| `tabIndex=(array with string)`| (initial)| `<number: -1>` |
| `tabIndex=(empty array)`| (initial)| `<number: -1>` |
| `tabIndex=(object)`| (initial)| `<number: -1>` |
| `tabIndex=(numeric string)`| (changed)| `<number: 42>` |
| `tabIndex=(-1)`| (initial)| `<number: -1>` |
| `tabIndex=(0)`| (changed)| `<number: 0>` |
| `tabIndex=(integer)`| (changed)| `<number: 1>` |
| `tabIndex=(NaN)`| (initial, warning)| `<number: -1>` |
| `tabIndex=(float)`| (changed)| `<number: 99>` |
| `tabIndex=(true)`| (initial, warning)| `<number: -1>` |
| `tabIndex=(false)`| (initial, warning)| `<number: -1>` |
| `tabIndex=(string 'true')`| (initial)| `<number: -1>` |
| `tabIndex=(string 'false')`| (initial)| `<number: -1>` |
| `tabIndex=(string 'on')`| (initial)| `<number: -1>` |
| `tabIndex=(string 'off')`| (initial)| `<number: -1>` |
| `tabIndex=(symbol)`| (initial, warning)| `<number: -1>` |
| `tabIndex=(function)`| (initial, warning)| `<number: -1>` |
| `tabIndex=(null)`| (initial)| `<number: -1>` |
| `tabIndex=(undefined)`| (initial)| `<number: -1>` |

## `tableValues` (on `<feFuncA>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `tableValues=(string)`| (changed)| `[0, 1, 2, 3]` |
| `tableValues=(empty string)`| (initial)| `[]` |
| `tableValues=(array with string)`| (changed)| `[0, 1, 2, 3]` |
| `tableValues=(empty array)`| (initial)| `[]` |
| `tableValues=(object)`| (initial)| `[]` |
| `tableValues=(numeric string)`| (changed)| `[42]` |
| `tableValues=(-1)`| (changed)| `[-1]` |
| `tableValues=(0)`| (changed)| `[0]` |
| `tableValues=(integer)`| (changed)| `[1]` |
| `tableValues=(NaN)`| (initial, warning)| `[]` |
| `tableValues=(float)`| (changed)| `[99.98999786376953]` |
| `tableValues=(true)`| (initial, warning)| `[]` |
| `tableValues=(false)`| (initial, warning)| `[]` |
| `tableValues=(string 'true')`| (initial)| `[]` |
| `tableValues=(string 'false')`| (initial)| `[]` |
| `tableValues=(string 'on')`| (initial)| `[]` |
| `tableValues=(string 'off')`| (initial)| `[]` |
| `tableValues=(symbol)`| (initial, warning)| `[]` |
| `tableValues=(function)`| (initial, warning)| `[]` |
| `tableValues=(null)`| (initial)| `[]` |
| `tableValues=(undefined)`| (initial)| `[]` |

## `target` (on `<a>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `target=(string)`| (changed)| `"a string"` |
| `target=(empty string)`| (initial)| `<empty string>` |
| `target=(array with string)`| (changed)| `"string"` |
| `target=(empty array)`| (initial)| `<empty string>` |
| `target=(object)`| (changed)| `"result of toString()"` |
| `target=(numeric string)`| (changed)| `"42"` |
| `target=(-1)`| (changed)| `"-1"` |
| `target=(0)`| (changed)| `"0"` |
| `target=(integer)`| (changed)| `"1"` |
| `target=(NaN)`| (changed, warning)| `"NaN"` |
| `target=(float)`| (changed)| `"99.99"` |
| `target=(true)`| (initial, warning)| `<empty string>` |
| `target=(false)`| (initial, warning)| `<empty string>` |
| `target=(string 'true')`| (changed)| `"true"` |
| `target=(string 'false')`| (changed)| `"false"` |
| `target=(string 'on')`| (changed)| `"on"` |
| `target=(string 'off')`| (changed)| `"off"` |
| `target=(symbol)`| (initial, warning)| `<empty string>` |
| `target=(function)`| (initial, warning)| `<empty string>` |
| `target=(null)`| (initial)| `<empty string>` |
| `target=(undefined)`| (initial)| `<empty string>` |

## `targetX` (on `<feConvolveMatrix>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `targetX=(string)`| (initial)| `<number: 0>` |
| `targetX=(empty string)`| (initial)| `<number: 0>` |
| `targetX=(array with string)`| (initial)| `<number: 0>` |
| `targetX=(empty array)`| (initial)| `<number: 0>` |
| `targetX=(object)`| (initial)| `<number: 0>` |
| `targetX=(numeric string)`| (changed)| `<number: 42>` |
| `targetX=(-1)`| (changed)| `<number: -1>` |
| `targetX=(0)`| (initial)| `<number: 0>` |
| `targetX=(integer)`| (changed)| `<number: 1>` |
| `targetX=(NaN)`| (initial, warning)| `<number: 0>` |
| `targetX=(float)`| (initial)| `<number: 0>` |
| `targetX=(true)`| (initial, warning)| `<number: 0>` |
| `targetX=(false)`| (initial, warning)| `<number: 0>` |
| `targetX=(string 'true')`| (initial)| `<number: 0>` |
| `targetX=(string 'false')`| (initial)| `<number: 0>` |
| `targetX=(string 'on')`| (initial)| `<number: 0>` |
| `targetX=(string 'off')`| (initial)| `<number: 0>` |
| `targetX=(symbol)`| (initial, warning)| `<number: 0>` |
| `targetX=(function)`| (initial, warning)| `<number: 0>` |
| `targetX=(null)`| (initial)| `<number: 0>` |
| `targetX=(undefined)`| (initial)| `<number: 0>` |

## `targetY` (on `<feConvolveMatrix>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `targetY=(string)`| (initial)| `<number: 0>` |
| `targetY=(empty string)`| (initial)| `<number: 0>` |
| `targetY=(array with string)`| (initial)| `<number: 0>` |
| `targetY=(empty array)`| (initial)| `<number: 0>` |
| `targetY=(object)`| (initial)| `<number: 0>` |
| `targetY=(numeric string)`| (changed)| `<number: 42>` |
| `targetY=(-1)`| (changed)| `<number: -1>` |
| `targetY=(0)`| (initial)| `<number: 0>` |
| `targetY=(integer)`| (changed)| `<number: 1>` |
| `targetY=(NaN)`| (initial, warning)| `<number: 0>` |
| `targetY=(float)`| (initial)| `<number: 0>` |
| `targetY=(true)`| (initial, warning)| `<number: 0>` |
| `targetY=(false)`| (initial, warning)| `<number: 0>` |
| `targetY=(string 'true')`| (initial)| `<number: 0>` |
| `targetY=(string 'false')`| (initial)| `<number: 0>` |
| `targetY=(string 'on')`| (initial)| `<number: 0>` |
| `targetY=(string 'off')`| (initial)| `<number: 0>` |
| `targetY=(symbol)`| (initial, warning)| `<number: 0>` |
| `targetY=(function)`| (initial, warning)| `<number: 0>` |
| `targetY=(null)`| (initial)| `<number: 0>` |
| `targetY=(undefined)`| (initial)| `<number: 0>` |

## `text-anchor` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `text-anchor=(string)`| (changed, warning)| `"a string"` |
| `text-anchor=(empty string)`| (changed, warning)| `<empty string>` |
| `text-anchor=(array with string)`| (changed, warning)| `"string"` |
| `text-anchor=(empty array)`| (changed, warning)| `<empty string>` |
| `text-anchor=(object)`| (changed, warning)| `"result of toString()"` |
| `text-anchor=(numeric string)`| (changed, warning)| `"42"` |
| `text-anchor=(-1)`| (changed, warning)| `"-1"` |
| `text-anchor=(0)`| (changed, warning)| `"0"` |
| `text-anchor=(integer)`| (changed, warning)| `"1"` |
| `text-anchor=(NaN)`| (changed, warning)| `"NaN"` |
| `text-anchor=(float)`| (changed, warning)| `"99.99"` |
| `text-anchor=(true)`| (initial, warning)| `<null>` |
| `text-anchor=(false)`| (initial, warning)| `<null>` |
| `text-anchor=(string 'true')`| (changed, warning)| `"true"` |
| `text-anchor=(string 'false')`| (changed, warning)| `"false"` |
| `text-anchor=(string 'on')`| (changed, warning)| `"on"` |
| `text-anchor=(string 'off')`| (changed, warning)| `"off"` |
| `text-anchor=(symbol)`| (initial, warning)| `<null>` |
| `text-anchor=(function)`| (initial, warning)| `<null>` |
| `text-anchor=(null)`| (initial, warning)| `<null>` |
| `text-anchor=(undefined)`| (initial, warning)| `<null>` |

## `text-decoration` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `text-decoration=(string)`| (changed, warning)| `"a string"` |
| `text-decoration=(empty string)`| (changed, warning)| `<empty string>` |
| `text-decoration=(array with string)`| (changed, warning)| `"string"` |
| `text-decoration=(empty array)`| (changed, warning)| `<empty string>` |
| `text-decoration=(object)`| (changed, warning)| `"result of toString()"` |
| `text-decoration=(numeric string)`| (changed, warning)| `"42"` |
| `text-decoration=(-1)`| (changed, warning)| `"-1"` |
| `text-decoration=(0)`| (changed, warning)| `"0"` |
| `text-decoration=(integer)`| (changed, warning)| `"1"` |
| `text-decoration=(NaN)`| (changed, warning)| `"NaN"` |
| `text-decoration=(float)`| (changed, warning)| `"99.99"` |
| `text-decoration=(true)`| (initial, warning)| `<null>` |
| `text-decoration=(false)`| (initial, warning)| `<null>` |
| `text-decoration=(string 'true')`| (changed, warning)| `"true"` |
| `text-decoration=(string 'false')`| (changed, warning)| `"false"` |
| `text-decoration=(string 'on')`| (changed, warning)| `"on"` |
| `text-decoration=(string 'off')`| (changed, warning)| `"off"` |
| `text-decoration=(symbol)`| (initial, warning)| `<null>` |
| `text-decoration=(function)`| (initial, warning)| `<null>` |
| `text-decoration=(null)`| (initial, warning)| `<null>` |
| `text-decoration=(undefined)`| (initial, warning)| `<null>` |

## `text-rendering` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `text-rendering=(string)`| (changed, warning)| `"a string"` |
| `text-rendering=(empty string)`| (changed, warning)| `<empty string>` |
| `text-rendering=(array with string)`| (changed, warning)| `"string"` |
| `text-rendering=(empty array)`| (changed, warning)| `<empty string>` |
| `text-rendering=(object)`| (changed, warning)| `"result of toString()"` |
| `text-rendering=(numeric string)`| (changed, warning)| `"42"` |
| `text-rendering=(-1)`| (changed, warning)| `"-1"` |
| `text-rendering=(0)`| (changed, warning)| `"0"` |
| `text-rendering=(integer)`| (changed, warning)| `"1"` |
| `text-rendering=(NaN)`| (changed, warning)| `"NaN"` |
| `text-rendering=(float)`| (changed, warning)| `"99.99"` |
| `text-rendering=(true)`| (initial, warning)| `<null>` |
| `text-rendering=(false)`| (initial, warning)| `<null>` |
| `text-rendering=(string 'true')`| (changed, warning)| `"true"` |
| `text-rendering=(string 'false')`| (changed, warning)| `"false"` |
| `text-rendering=(string 'on')`| (changed, warning)| `"on"` |
| `text-rendering=(string 'off')`| (changed, warning)| `"off"` |
| `text-rendering=(symbol)`| (initial, warning)| `<null>` |
| `text-rendering=(function)`| (initial, warning)| `<null>` |
| `text-rendering=(null)`| (initial, warning)| `<null>` |
| `text-rendering=(undefined)`| (initial, warning)| `<null>` |

## `textAnchor` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `textAnchor=(string)`| (changed)| `"a string"` |
| `textAnchor=(empty string)`| (changed)| `<empty string>` |
| `textAnchor=(array with string)`| (changed)| `"string"` |
| `textAnchor=(empty array)`| (changed)| `<empty string>` |
| `textAnchor=(object)`| (changed)| `"result of toString()"` |
| `textAnchor=(numeric string)`| (changed)| `"42"` |
| `textAnchor=(-1)`| (changed)| `"-1"` |
| `textAnchor=(0)`| (changed)| `"0"` |
| `textAnchor=(integer)`| (changed)| `"1"` |
| `textAnchor=(NaN)`| (changed, warning)| `"NaN"` |
| `textAnchor=(float)`| (changed)| `"99.99"` |
| `textAnchor=(true)`| (initial, warning)| `<null>` |
| `textAnchor=(false)`| (initial, warning)| `<null>` |
| `textAnchor=(string 'true')`| (changed)| `"true"` |
| `textAnchor=(string 'false')`| (changed)| `"false"` |
| `textAnchor=(string 'on')`| (changed)| `"on"` |
| `textAnchor=(string 'off')`| (changed)| `"off"` |
| `textAnchor=(symbol)`| (initial, warning)| `<null>` |
| `textAnchor=(function)`| (initial, warning)| `<null>` |
| `textAnchor=(null)`| (initial)| `<null>` |
| `textAnchor=(undefined)`| (initial)| `<null>` |

## `textDecoration` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `textDecoration=(string)`| (changed)| `"a string"` |
| `textDecoration=(empty string)`| (changed)| `<empty string>` |
| `textDecoration=(array with string)`| (changed)| `"string"` |
| `textDecoration=(empty array)`| (changed)| `<empty string>` |
| `textDecoration=(object)`| (changed)| `"result of toString()"` |
| `textDecoration=(numeric string)`| (changed)| `"42"` |
| `textDecoration=(-1)`| (changed)| `"-1"` |
| `textDecoration=(0)`| (changed)| `"0"` |
| `textDecoration=(integer)`| (changed)| `"1"` |
| `textDecoration=(NaN)`| (changed, warning)| `"NaN"` |
| `textDecoration=(float)`| (changed)| `"99.99"` |
| `textDecoration=(true)`| (initial, warning)| `<null>` |
| `textDecoration=(false)`| (initial, warning)| `<null>` |
| `textDecoration=(string 'true')`| (changed)| `"true"` |
| `textDecoration=(string 'false')`| (changed)| `"false"` |
| `textDecoration=(string 'on')`| (changed)| `"on"` |
| `textDecoration=(string 'off')`| (changed)| `"off"` |
| `textDecoration=(symbol)`| (initial, warning)| `<null>` |
| `textDecoration=(function)`| (initial, warning)| `<null>` |
| `textDecoration=(null)`| (initial)| `<null>` |
| `textDecoration=(undefined)`| (initial)| `<null>` |

## `textLength` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `textLength=(string)`| (initial)| `<SVGLength: 0>` |
| `textLength=(empty string)`| (initial)| `<SVGLength: 0>` |
| `textLength=(array with string)`| (initial)| `<SVGLength: 0>` |
| `textLength=(empty array)`| (initial)| `<SVGLength: 0>` |
| `textLength=(object)`| (initial)| `<SVGLength: 0>` |
| `textLength=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `textLength=(-1)`| (changed)| `<SVGLength: -1>` |
| `textLength=(0)`| (initial)| `<SVGLength: 0>` |
| `textLength=(integer)`| (changed)| `<SVGLength: 1>` |
| `textLength=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `textLength=(float)`| (changed)| `<SVGLength: 99.99>` |
| `textLength=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `textLength=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `textLength=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `textLength=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `textLength=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `textLength=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `textLength=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `textLength=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `textLength=(null)`| (initial)| `<SVGLength: 0>` |
| `textLength=(undefined)`| (initial)| `<SVGLength: 0>` |

## `textRendering` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `textRendering=(string)`| (changed)| `"a string"` |
| `textRendering=(empty string)`| (changed)| `<empty string>` |
| `textRendering=(array with string)`| (changed)| `"string"` |
| `textRendering=(empty array)`| (changed)| `<empty string>` |
| `textRendering=(object)`| (changed)| `"result of toString()"` |
| `textRendering=(numeric string)`| (changed)| `"42"` |
| `textRendering=(-1)`| (changed)| `"-1"` |
| `textRendering=(0)`| (changed)| `"0"` |
| `textRendering=(integer)`| (changed)| `"1"` |
| `textRendering=(NaN)`| (changed, warning)| `"NaN"` |
| `textRendering=(float)`| (changed)| `"99.99"` |
| `textRendering=(true)`| (initial, warning)| `<null>` |
| `textRendering=(false)`| (initial, warning)| `<null>` |
| `textRendering=(string 'true')`| (changed)| `"true"` |
| `textRendering=(string 'false')`| (changed)| `"false"` |
| `textRendering=(string 'on')`| (changed)| `"on"` |
| `textRendering=(string 'off')`| (changed)| `"off"` |
| `textRendering=(symbol)`| (initial, warning)| `<null>` |
| `textRendering=(function)`| (initial, warning)| `<null>` |
| `textRendering=(null)`| (initial)| `<null>` |
| `textRendering=(undefined)`| (initial)| `<null>` |

## `title` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `title=(string)`| (changed)| `"a string"` |
| `title=(empty string)`| (initial)| `<empty string>` |
| `title=(array with string)`| (changed)| `"string"` |
| `title=(empty array)`| (initial)| `<empty string>` |
| `title=(object)`| (changed)| `"result of toString()"` |
| `title=(numeric string)`| (changed)| `"42"` |
| `title=(-1)`| (changed)| `"-1"` |
| `title=(0)`| (changed)| `"0"` |
| `title=(integer)`| (changed)| `"1"` |
| `title=(NaN)`| (changed, warning)| `"NaN"` |
| `title=(float)`| (changed)| `"99.99"` |
| `title=(true)`| (initial, warning)| `<empty string>` |
| `title=(false)`| (initial, warning)| `<empty string>` |
| `title=(string 'true')`| (changed)| `"true"` |
| `title=(string 'false')`| (changed)| `"false"` |
| `title=(string 'on')`| (changed)| `"on"` |
| `title=(string 'off')`| (changed)| `"off"` |
| `title=(symbol)`| (initial, warning)| `<empty string>` |
| `title=(function)`| (initial, warning)| `<empty string>` |
| `title=(null)`| (initial)| `<empty string>` |
| `title=(undefined)`| (initial)| `<empty string>` |

## `to` (on `<set>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `to=(string)`| (changed)| `"a string"` |
| `to=(empty string)`| (changed)| `<empty string>` |
| `to=(array with string)`| (changed)| `"string"` |
| `to=(empty array)`| (changed)| `<empty string>` |
| `to=(object)`| (changed)| `"result of toString()"` |
| `to=(numeric string)`| (changed)| `"42"` |
| `to=(-1)`| (changed)| `"-1"` |
| `to=(0)`| (changed)| `"0"` |
| `to=(integer)`| (changed)| `"1"` |
| `to=(NaN)`| (changed, warning)| `"NaN"` |
| `to=(float)`| (changed)| `"99.99"` |
| `to=(true)`| (initial, warning)| `<null>` |
| `to=(false)`| (initial, warning)| `<null>` |
| `to=(string 'true')`| (changed)| `"true"` |
| `to=(string 'false')`| (changed)| `"false"` |
| `to=(string 'on')`| (changed)| `"on"` |
| `to=(string 'off')`| (changed)| `"off"` |
| `to=(symbol)`| (initial, warning)| `<null>` |
| `to=(function)`| (initial, warning)| `<null>` |
| `to=(null)`| (initial)| `<null>` |
| `to=(undefined)`| (initial)| `<null>` |

## `transform` (on `<a>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `transform=(string)`| (changed)| `[<SVGMatrix 1 0 0 1 -10 -20>/2/0, <SVGMatrix 2 0 0 2 0 0>/3/0, <SVGMatrix 0.7071067811865476 0.7071067811865475 -0.7071067811865475 0.7071067811865476 0 0>/4/45, <SVGMatrix 1 0 0 1 5 10>/2/0]` |
| `transform=(empty string)`| (initial)| `[]` |
| `transform=(array with string)`| (changed)| `[<SVGMatrix 1 0 0 1 -10 -20>/2/0, <SVGMatrix 2 0 0 2 0 0>/3/0, <SVGMatrix 0.7071067811865476 0.7071067811865475 -0.7071067811865475 0.7071067811865476 0 0>/4/45, <SVGMatrix 1 0 0 1 5 10>/2/0]` |
| `transform=(empty array)`| (initial)| `[]` |
| `transform=(object)`| (initial)| `[]` |
| `transform=(numeric string)`| (initial)| `[]` |
| `transform=(-1)`| (initial)| `[]` |
| `transform=(0)`| (initial)| `[]` |
| `transform=(integer)`| (initial)| `[]` |
| `transform=(NaN)`| (initial, warning)| `[]` |
| `transform=(float)`| (initial)| `[]` |
| `transform=(true)`| (initial, warning)| `[]` |
| `transform=(false)`| (initial, warning)| `[]` |
| `transform=(string 'true')`| (initial)| `[]` |
| `transform=(string 'false')`| (initial)| `[]` |
| `transform=(string 'on')`| (initial)| `[]` |
| `transform=(string 'off')`| (initial)| `[]` |
| `transform=(symbol)`| (initial, warning)| `[]` |
| `transform=(function)`| (initial, warning)| `[]` |
| `transform=(null)`| (initial)| `[]` |
| `transform=(undefined)`| (initial)| `[]` |

## `transform-origin` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `transform-origin=(string)`| (changed, warning)| `"a string"` |
| `transform-origin=(empty string)`| (changed, warning)| `<empty string>` |
| `transform-origin=(array with string)`| (changed, warning)| `"string"` |
| `transform-origin=(empty array)`| (changed, warning)| `<empty string>` |
| `transform-origin=(object)`| (changed, warning)| `"result of toString()"` |
| `transform-origin=(numeric string)`| (changed, warning)| `"42"` |
| `transform-origin=(-1)`| (changed, warning)| `"-1"` |
| `transform-origin=(0)`| (changed, warning)| `"0"` |
| `transform-origin=(integer)`| (changed, warning)| `"1"` |
| `transform-origin=(NaN)`| (changed, warning)| `"NaN"` |
| `transform-origin=(float)`| (changed, warning)| `"99.99"` |
| `transform-origin=(true)`| (initial, warning)| `<null>` |
| `transform-origin=(false)`| (initial, warning)| `<null>` |
| `transform-origin=(string 'true')`| (changed, warning)| `"true"` |
| `transform-origin=(string 'false')`| (changed, warning)| `"false"` |
| `transform-origin=(string 'on')`| (changed, warning)| `"on"` |
| `transform-origin=(string 'off')`| (changed, warning)| `"off"` |
| `transform-origin=(symbol)`| (initial, warning)| `<null>` |
| `transform-origin=(function)`| (initial, warning)| `<null>` |
| `transform-origin=(null)`| (initial, warning)| `<null>` |
| `transform-origin=(undefined)`| (initial, warning)| `<null>` |

## `transformOrigin` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `transformOrigin=(string)`| (changed)| `"a string"` |
| `transformOrigin=(empty string)`| (changed)| `<empty string>` |
| `transformOrigin=(array with string)`| (changed)| `"string"` |
| `transformOrigin=(empty array)`| (changed)| `<empty string>` |
| `transformOrigin=(object)`| (changed)| `"result of toString()"` |
| `transformOrigin=(numeric string)`| (changed)| `"42"` |
| `transformOrigin=(-1)`| (changed)| `"-1"` |
| `transformOrigin=(0)`| (changed)| `"0"` |
| `transformOrigin=(integer)`| (changed)| `"1"` |
| `transformOrigin=(NaN)`| (changed, warning)| `"NaN"` |
| `transformOrigin=(float)`| (changed)| `"99.99"` |
| `transformOrigin=(true)`| (initial, warning)| `<null>` |
| `transformOrigin=(false)`| (initial, warning)| `<null>` |
| `transformOrigin=(string 'true')`| (changed)| `"true"` |
| `transformOrigin=(string 'false')`| (changed)| `"false"` |
| `transformOrigin=(string 'on')`| (changed)| `"on"` |
| `transformOrigin=(string 'off')`| (changed)| `"off"` |
| `transformOrigin=(symbol)`| (initial, warning)| `<null>` |
| `transformOrigin=(function)`| (initial, warning)| `<null>` |
| `transformOrigin=(null)`| (initial)| `<null>` |
| `transformOrigin=(undefined)`| (initial)| `<null>` |

## `type` (on `<button>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `type=(string)`| (changed)| `"reset"` |
| `type=(empty string)`| (initial)| `"submit"` |
| `type=(array with string)`| (changed)| `"reset"` |
| `type=(empty array)`| (initial)| `"submit"` |
| `type=(object)`| (initial)| `"submit"` |
| `type=(numeric string)`| (initial)| `"submit"` |
| `type=(-1)`| (initial)| `"submit"` |
| `type=(0)`| (initial)| `"submit"` |
| `type=(integer)`| (initial)| `"submit"` |
| `type=(NaN)`| (initial, warning)| `"submit"` |
| `type=(float)`| (initial)| `"submit"` |
| `type=(true)`| (initial, warning)| `"submit"` |
| `type=(false)`| (initial, warning)| `"submit"` |
| `type=(string 'true')`| (initial)| `"submit"` |
| `type=(string 'false')`| (initial)| `"submit"` |
| `type=(string 'on')`| (initial)| `"submit"` |
| `type=(string 'off')`| (initial)| `"submit"` |
| `type=(symbol)`| (initial, warning)| `"submit"` |
| `type=(function)`| (initial, warning)| `"submit"` |
| `type=(null)`| (initial)| `"submit"` |
| `type=(undefined)`| (initial)| `"submit"` |

## `type` (on `<feFuncA>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `type=(string)`| (changed)| `<number: 3>` |
| `type=(empty string)`| (initial)| `<number: 1>` |
| `type=(array with string)`| (changed)| `<number: 3>` |
| `type=(empty array)`| (initial)| `<number: 1>` |
| `type=(object)`| (initial)| `<number: 1>` |
| `type=(numeric string)`| (initial)| `<number: 1>` |
| `type=(-1)`| (initial)| `<number: 1>` |
| `type=(0)`| (initial)| `<number: 1>` |
| `type=(integer)`| (initial)| `<number: 1>` |
| `type=(NaN)`| (initial, warning)| `<number: 1>` |
| `type=(float)`| (initial)| `<number: 1>` |
| `type=(true)`| (initial, warning)| `<number: 1>` |
| `type=(false)`| (initial, warning)| `<number: 1>` |
| `type=(string 'true')`| (initial)| `<number: 1>` |
| `type=(string 'false')`| (initial)| `<number: 1>` |
| `type=(string 'on')`| (initial)| `<number: 1>` |
| `type=(string 'off')`| (initial)| `<number: 1>` |
| `type=(symbol)`| (initial, warning)| `<number: 1>` |
| `type=(function)`| (initial, warning)| `<number: 1>` |
| `type=(null)`| (initial)| `<number: 1>` |
| `type=(undefined)`| (initial)| `<number: 1>` |

## `typeof` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `typeof=(string)`| (changed)| `"a string"` |
| `typeof=(empty string)`| (changed)| `<empty string>` |
| `typeof=(array with string)`| (changed)| `"string"` |
| `typeof=(empty array)`| (changed)| `<empty string>` |
| `typeof=(object)`| (changed)| `"result of toString()"` |
| `typeof=(numeric string)`| (changed)| `"42"` |
| `typeof=(-1)`| (changed)| `"-1"` |
| `typeof=(0)`| (changed)| `"0"` |
| `typeof=(integer)`| (changed)| `"1"` |
| `typeof=(NaN)`| (changed, warning)| `"NaN"` |
| `typeof=(float)`| (changed)| `"99.99"` |
| `typeof=(true)`| (initial, warning)| `<null>` |
| `typeof=(false)`| (initial, warning)| `<null>` |
| `typeof=(string 'true')`| (changed)| `"true"` |
| `typeof=(string 'false')`| (changed)| `"false"` |
| `typeof=(string 'on')`| (changed)| `"on"` |
| `typeof=(string 'off')`| (changed)| `"off"` |
| `typeof=(symbol)`| (initial, warning)| `<null>` |
| `typeof=(function)`| (initial, warning)| `<null>` |
| `typeof=(null)`| (initial)| `<null>` |
| `typeof=(undefined)`| (initial)| `<null>` |

## `u1` (on `<hkern>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `u1=(string)`| (changed)| `"a string"` |
| `u1=(empty string)`| (changed)| `<empty string>` |
| `u1=(array with string)`| (changed)| `"string"` |
| `u1=(empty array)`| (changed)| `<empty string>` |
| `u1=(object)`| (changed)| `"result of toString()"` |
| `u1=(numeric string)`| (changed)| `"42"` |
| `u1=(-1)`| (changed)| `"-1"` |
| `u1=(0)`| (changed)| `"0"` |
| `u1=(integer)`| (changed)| `"1"` |
| `u1=(NaN)`| (changed, warning)| `"NaN"` |
| `u1=(float)`| (changed)| `"99.99"` |
| `u1=(true)`| (initial, warning)| `<null>` |
| `u1=(false)`| (initial, warning)| `<null>` |
| `u1=(string 'true')`| (changed)| `"true"` |
| `u1=(string 'false')`| (changed)| `"false"` |
| `u1=(string 'on')`| (changed)| `"on"` |
| `u1=(string 'off')`| (changed)| `"off"` |
| `u1=(symbol)`| (initial, warning)| `<null>` |
| `u1=(function)`| (initial, warning)| `<null>` |
| `u1=(null)`| (initial)| `<null>` |
| `u1=(undefined)`| (initial)| `<null>` |

## `u2` (on `<hkern>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `u2=(string)`| (changed)| `"a string"` |
| `u2=(empty string)`| (changed)| `<empty string>` |
| `u2=(array with string)`| (changed)| `"string"` |
| `u2=(empty array)`| (changed)| `<empty string>` |
| `u2=(object)`| (changed)| `"result of toString()"` |
| `u2=(numeric string)`| (changed)| `"42"` |
| `u2=(-1)`| (changed)| `"-1"` |
| `u2=(0)`| (changed)| `"0"` |
| `u2=(integer)`| (changed)| `"1"` |
| `u2=(NaN)`| (changed, warning)| `"NaN"` |
| `u2=(float)`| (changed)| `"99.99"` |
| `u2=(true)`| (initial, warning)| `<null>` |
| `u2=(false)`| (initial, warning)| `<null>` |
| `u2=(string 'true')`| (changed)| `"true"` |
| `u2=(string 'false')`| (changed)| `"false"` |
| `u2=(string 'on')`| (changed)| `"on"` |
| `u2=(string 'off')`| (changed)| `"off"` |
| `u2=(symbol)`| (initial, warning)| `<null>` |
| `u2=(function)`| (initial, warning)| `<null>` |
| `u2=(null)`| (initial)| `<null>` |
| `u2=(undefined)`| (initial)| `<null>` |

## `underline-position` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `underline-position=(string)`| (changed, warning)| `"a string"` |
| `underline-position=(empty string)`| (changed, warning)| `<empty string>` |
| `underline-position=(array with string)`| (changed, warning)| `"string"` |
| `underline-position=(empty array)`| (changed, warning)| `<empty string>` |
| `underline-position=(object)`| (changed, warning)| `"result of toString()"` |
| `underline-position=(numeric string)`| (changed, warning)| `"42"` |
| `underline-position=(-1)`| (changed, warning)| `"-1"` |
| `underline-position=(0)`| (changed, warning)| `"0"` |
| `underline-position=(integer)`| (changed, warning)| `"1"` |
| `underline-position=(NaN)`| (changed, warning)| `"NaN"` |
| `underline-position=(float)`| (changed, warning)| `"99.99"` |
| `underline-position=(true)`| (initial, warning)| `<null>` |
| `underline-position=(false)`| (initial, warning)| `<null>` |
| `underline-position=(string 'true')`| (changed, warning)| `"true"` |
| `underline-position=(string 'false')`| (changed, warning)| `"false"` |
| `underline-position=(string 'on')`| (changed, warning)| `"on"` |
| `underline-position=(string 'off')`| (changed, warning)| `"off"` |
| `underline-position=(symbol)`| (initial, warning)| `<null>` |
| `underline-position=(function)`| (initial, warning)| `<null>` |
| `underline-position=(null)`| (initial, warning)| `<null>` |
| `underline-position=(undefined)`| (initial, warning)| `<null>` |

## `underline-thickness` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `underline-thickness=(string)`| (changed, warning)| `"a string"` |
| `underline-thickness=(empty string)`| (changed, warning)| `<empty string>` |
| `underline-thickness=(array with string)`| (changed, warning)| `"string"` |
| `underline-thickness=(empty array)`| (changed, warning)| `<empty string>` |
| `underline-thickness=(object)`| (changed, warning)| `"result of toString()"` |
| `underline-thickness=(numeric string)`| (changed, warning)| `"42"` |
| `underline-thickness=(-1)`| (changed, warning)| `"-1"` |
| `underline-thickness=(0)`| (changed, warning)| `"0"` |
| `underline-thickness=(integer)`| (changed, warning)| `"1"` |
| `underline-thickness=(NaN)`| (changed, warning)| `"NaN"` |
| `underline-thickness=(float)`| (changed, warning)| `"99.99"` |
| `underline-thickness=(true)`| (initial, warning)| `<null>` |
| `underline-thickness=(false)`| (initial, warning)| `<null>` |
| `underline-thickness=(string 'true')`| (changed, warning)| `"true"` |
| `underline-thickness=(string 'false')`| (changed, warning)| `"false"` |
| `underline-thickness=(string 'on')`| (changed, warning)| `"on"` |
| `underline-thickness=(string 'off')`| (changed, warning)| `"off"` |
| `underline-thickness=(symbol)`| (initial, warning)| `<null>` |
| `underline-thickness=(function)`| (initial, warning)| `<null>` |
| `underline-thickness=(null)`| (initial, warning)| `<null>` |
| `underline-thickness=(undefined)`| (initial, warning)| `<null>` |

## `underlinePosition` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `underlinePosition=(string)`| (changed)| `"a string"` |
| `underlinePosition=(empty string)`| (changed)| `<empty string>` |
| `underlinePosition=(array with string)`| (changed)| `"string"` |
| `underlinePosition=(empty array)`| (changed)| `<empty string>` |
| `underlinePosition=(object)`| (changed)| `"result of toString()"` |
| `underlinePosition=(numeric string)`| (changed)| `"42"` |
| `underlinePosition=(-1)`| (changed)| `"-1"` |
| `underlinePosition=(0)`| (changed)| `"0"` |
| `underlinePosition=(integer)`| (changed)| `"1"` |
| `underlinePosition=(NaN)`| (changed, warning)| `"NaN"` |
| `underlinePosition=(float)`| (changed)| `"99.99"` |
| `underlinePosition=(true)`| (initial, warning)| `<null>` |
| `underlinePosition=(false)`| (initial, warning)| `<null>` |
| `underlinePosition=(string 'true')`| (changed)| `"true"` |
| `underlinePosition=(string 'false')`| (changed)| `"false"` |
| `underlinePosition=(string 'on')`| (changed)| `"on"` |
| `underlinePosition=(string 'off')`| (changed)| `"off"` |
| `underlinePosition=(symbol)`| (initial, warning)| `<null>` |
| `underlinePosition=(function)`| (initial, warning)| `<null>` |
| `underlinePosition=(null)`| (initial)| `<null>` |
| `underlinePosition=(undefined)`| (initial)| `<null>` |

## `underlineThickness` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `underlineThickness=(string)`| (changed)| `"a string"` |
| `underlineThickness=(empty string)`| (changed)| `<empty string>` |
| `underlineThickness=(array with string)`| (changed)| `"string"` |
| `underlineThickness=(empty array)`| (changed)| `<empty string>` |
| `underlineThickness=(object)`| (changed)| `"result of toString()"` |
| `underlineThickness=(numeric string)`| (changed)| `"42"` |
| `underlineThickness=(-1)`| (changed)| `"-1"` |
| `underlineThickness=(0)`| (changed)| `"0"` |
| `underlineThickness=(integer)`| (changed)| `"1"` |
| `underlineThickness=(NaN)`| (changed, warning)| `"NaN"` |
| `underlineThickness=(float)`| (changed)| `"99.99"` |
| `underlineThickness=(true)`| (initial, warning)| `<null>` |
| `underlineThickness=(false)`| (initial, warning)| `<null>` |
| `underlineThickness=(string 'true')`| (changed)| `"true"` |
| `underlineThickness=(string 'false')`| (changed)| `"false"` |
| `underlineThickness=(string 'on')`| (changed)| `"on"` |
| `underlineThickness=(string 'off')`| (changed)| `"off"` |
| `underlineThickness=(symbol)`| (initial, warning)| `<null>` |
| `underlineThickness=(function)`| (initial, warning)| `<null>` |
| `underlineThickness=(null)`| (initial)| `<null>` |
| `underlineThickness=(undefined)`| (initial)| `<null>` |

## `unicode` (on `<glyph>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `unicode=(string)`| (changed)| `"a string"` |
| `unicode=(empty string)`| (changed)| `<empty string>` |
| `unicode=(array with string)`| (changed)| `"string"` |
| `unicode=(empty array)`| (changed)| `<empty string>` |
| `unicode=(object)`| (changed)| `"result of toString()"` |
| `unicode=(numeric string)`| (changed)| `"42"` |
| `unicode=(-1)`| (changed)| `"-1"` |
| `unicode=(0)`| (changed)| `"0"` |
| `unicode=(integer)`| (changed)| `"1"` |
| `unicode=(NaN)`| (changed, warning)| `"NaN"` |
| `unicode=(float)`| (changed)| `"99.99"` |
| `unicode=(true)`| (initial, warning)| `<null>` |
| `unicode=(false)`| (initial, warning)| `<null>` |
| `unicode=(string 'true')`| (changed)| `"true"` |
| `unicode=(string 'false')`| (changed)| `"false"` |
| `unicode=(string 'on')`| (changed)| `"on"` |
| `unicode=(string 'off')`| (changed)| `"off"` |
| `unicode=(symbol)`| (initial, warning)| `<null>` |
| `unicode=(function)`| (initial, warning)| `<null>` |
| `unicode=(null)`| (initial)| `<null>` |
| `unicode=(undefined)`| (initial)| `<null>` |

## `unicode-bidi` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `unicode-bidi=(string)`| (changed, warning)| `"a string"` |
| `unicode-bidi=(empty string)`| (changed, warning)| `<empty string>` |
| `unicode-bidi=(array with string)`| (changed, warning)| `"string"` |
| `unicode-bidi=(empty array)`| (changed, warning)| `<empty string>` |
| `unicode-bidi=(object)`| (changed, warning)| `"result of toString()"` |
| `unicode-bidi=(numeric string)`| (changed, warning)| `"42"` |
| `unicode-bidi=(-1)`| (changed, warning)| `"-1"` |
| `unicode-bidi=(0)`| (changed, warning)| `"0"` |
| `unicode-bidi=(integer)`| (changed, warning)| `"1"` |
| `unicode-bidi=(NaN)`| (changed, warning)| `"NaN"` |
| `unicode-bidi=(float)`| (changed, warning)| `"99.99"` |
| `unicode-bidi=(true)`| (initial, warning)| `<null>` |
| `unicode-bidi=(false)`| (initial, warning)| `<null>` |
| `unicode-bidi=(string 'true')`| (changed, warning)| `"true"` |
| `unicode-bidi=(string 'false')`| (changed, warning)| `"false"` |
| `unicode-bidi=(string 'on')`| (changed, warning)| `"on"` |
| `unicode-bidi=(string 'off')`| (changed, warning)| `"off"` |
| `unicode-bidi=(symbol)`| (initial, warning)| `<null>` |
| `unicode-bidi=(function)`| (initial, warning)| `<null>` |
| `unicode-bidi=(null)`| (initial, warning)| `<null>` |
| `unicode-bidi=(undefined)`| (initial, warning)| `<null>` |

## `unicode-range` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `unicode-range=(string)`| (changed, warning)| `"a string"` |
| `unicode-range=(empty string)`| (changed, warning)| `<empty string>` |
| `unicode-range=(array with string)`| (changed, warning)| `"string"` |
| `unicode-range=(empty array)`| (changed, warning)| `<empty string>` |
| `unicode-range=(object)`| (changed, warning)| `"result of toString()"` |
| `unicode-range=(numeric string)`| (changed, warning)| `"42"` |
| `unicode-range=(-1)`| (changed, warning)| `"-1"` |
| `unicode-range=(0)`| (changed, warning)| `"0"` |
| `unicode-range=(integer)`| (changed, warning)| `"1"` |
| `unicode-range=(NaN)`| (changed, warning)| `"NaN"` |
| `unicode-range=(float)`| (changed, warning)| `"99.99"` |
| `unicode-range=(true)`| (initial, warning)| `<null>` |
| `unicode-range=(false)`| (initial, warning)| `<null>` |
| `unicode-range=(string 'true')`| (changed, warning)| `"true"` |
| `unicode-range=(string 'false')`| (changed, warning)| `"false"` |
| `unicode-range=(string 'on')`| (changed, warning)| `"on"` |
| `unicode-range=(string 'off')`| (changed, warning)| `"off"` |
| `unicode-range=(symbol)`| (initial, warning)| `<null>` |
| `unicode-range=(function)`| (initial, warning)| `<null>` |
| `unicode-range=(null)`| (initial, warning)| `<null>` |
| `unicode-range=(undefined)`| (initial, warning)| `<null>` |

## `unicodeBidi` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `unicodeBidi=(string)`| (changed)| `"a string"` |
| `unicodeBidi=(empty string)`| (changed)| `<empty string>` |
| `unicodeBidi=(array with string)`| (changed)| `"string"` |
| `unicodeBidi=(empty array)`| (changed)| `<empty string>` |
| `unicodeBidi=(object)`| (changed)| `"result of toString()"` |
| `unicodeBidi=(numeric string)`| (changed)| `"42"` |
| `unicodeBidi=(-1)`| (changed)| `"-1"` |
| `unicodeBidi=(0)`| (changed)| `"0"` |
| `unicodeBidi=(integer)`| (changed)| `"1"` |
| `unicodeBidi=(NaN)`| (changed, warning)| `"NaN"` |
| `unicodeBidi=(float)`| (changed)| `"99.99"` |
| `unicodeBidi=(true)`| (initial, warning)| `<null>` |
| `unicodeBidi=(false)`| (initial, warning)| `<null>` |
| `unicodeBidi=(string 'true')`| (changed)| `"true"` |
| `unicodeBidi=(string 'false')`| (changed)| `"false"` |
| `unicodeBidi=(string 'on')`| (changed)| `"on"` |
| `unicodeBidi=(string 'off')`| (changed)| `"off"` |
| `unicodeBidi=(symbol)`| (initial, warning)| `<null>` |
| `unicodeBidi=(function)`| (initial, warning)| `<null>` |
| `unicodeBidi=(null)`| (initial)| `<null>` |
| `unicodeBidi=(undefined)`| (initial)| `<null>` |

## `unicodeRange` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `unicodeRange=(string)`| (changed)| `"a string"` |
| `unicodeRange=(empty string)`| (changed)| `<empty string>` |
| `unicodeRange=(array with string)`| (changed)| `"string"` |
| `unicodeRange=(empty array)`| (changed)| `<empty string>` |
| `unicodeRange=(object)`| (changed)| `"result of toString()"` |
| `unicodeRange=(numeric string)`| (changed)| `"42"` |
| `unicodeRange=(-1)`| (changed)| `"-1"` |
| `unicodeRange=(0)`| (changed)| `"0"` |
| `unicodeRange=(integer)`| (changed)| `"1"` |
| `unicodeRange=(NaN)`| (changed, warning)| `"NaN"` |
| `unicodeRange=(float)`| (changed)| `"99.99"` |
| `unicodeRange=(true)`| (initial, warning)| `<null>` |
| `unicodeRange=(false)`| (initial, warning)| `<null>` |
| `unicodeRange=(string 'true')`| (changed)| `"true"` |
| `unicodeRange=(string 'false')`| (changed)| `"false"` |
| `unicodeRange=(string 'on')`| (changed)| `"on"` |
| `unicodeRange=(string 'off')`| (changed)| `"off"` |
| `unicodeRange=(symbol)`| (initial, warning)| `<null>` |
| `unicodeRange=(function)`| (initial, warning)| `<null>` |
| `unicodeRange=(null)`| (initial)| `<null>` |
| `unicodeRange=(undefined)`| (initial)| `<null>` |

## `units-per-em` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `units-per-em=(string)`| (changed, warning)| `"a string"` |
| `units-per-em=(empty string)`| (changed, warning)| `<empty string>` |
| `units-per-em=(array with string)`| (changed, warning)| `"string"` |
| `units-per-em=(empty array)`| (changed, warning)| `<empty string>` |
| `units-per-em=(object)`| (changed, warning)| `"result of toString()"` |
| `units-per-em=(numeric string)`| (changed, warning)| `"42"` |
| `units-per-em=(-1)`| (changed, warning)| `"-1"` |
| `units-per-em=(0)`| (changed, warning)| `"0"` |
| `units-per-em=(integer)`| (changed, warning)| `"1"` |
| `units-per-em=(NaN)`| (changed, warning)| `"NaN"` |
| `units-per-em=(float)`| (changed, warning)| `"99.99"` |
| `units-per-em=(true)`| (initial, warning)| `<null>` |
| `units-per-em=(false)`| (initial, warning)| `<null>` |
| `units-per-em=(string 'true')`| (changed, warning)| `"true"` |
| `units-per-em=(string 'false')`| (changed, warning)| `"false"` |
| `units-per-em=(string 'on')`| (changed, warning)| `"on"` |
| `units-per-em=(string 'off')`| (changed, warning)| `"off"` |
| `units-per-em=(symbol)`| (initial, warning)| `<null>` |
| `units-per-em=(function)`| (initial, warning)| `<null>` |
| `units-per-em=(null)`| (initial, warning)| `<null>` |
| `units-per-em=(undefined)`| (initial, warning)| `<null>` |

## `unitsPerEm` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `unitsPerEm=(string)`| (initial)| `<null>` |
| `unitsPerEm=(empty string)`| (initial)| `<null>` |
| `unitsPerEm=(array with string)`| (initial)| `<null>` |
| `unitsPerEm=(empty array)`| (initial)| `<null>` |
| `unitsPerEm=(object)`| (initial)| `<null>` |
| `unitsPerEm=(numeric string)`| (initial)| `<null>` |
| `unitsPerEm=(-1)`| (initial)| `<null>` |
| `unitsPerEm=(0)`| (initial)| `<null>` |
| `unitsPerEm=(integer)`| (initial)| `<null>` |
| `unitsPerEm=(NaN)`| (initial, warning)| `<null>` |
| `unitsPerEm=(float)`| (initial)| `<null>` |
| `unitsPerEm=(true)`| (initial, warning)| `<null>` |
| `unitsPerEm=(false)`| (initial, warning)| `<null>` |
| `unitsPerEm=(string 'true')`| (initial)| `<null>` |
| `unitsPerEm=(string 'false')`| (initial)| `<null>` |
| `unitsPerEm=(string 'on')`| (initial)| `<null>` |
| `unitsPerEm=(string 'off')`| (initial)| `<null>` |
| `unitsPerEm=(symbol)`| (initial, warning)| `<null>` |
| `unitsPerEm=(function)`| (initial, warning)| `<null>` |
| `unitsPerEm=(null)`| (initial)| `<null>` |
| `unitsPerEm=(undefined)`| (initial)| `<null>` |

## `unknown` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `unknown=(string)`| (changed)| `"a string"` |
| `unknown=(empty string)`| (changed)| `<empty string>` |
| `unknown=(array with string)`| (changed)| `"string"` |
| `unknown=(empty array)`| (changed)| `<empty string>` |
| `unknown=(object)`| (changed)| `"result of toString()"` |
| `unknown=(numeric string)`| (changed)| `"42"` |
| `unknown=(-1)`| (changed)| `"-1"` |
| `unknown=(0)`| (changed)| `"0"` |
| `unknown=(integer)`| (changed)| `"1"` |
| `unknown=(NaN)`| (changed, warning)| `"NaN"` |
| `unknown=(float)`| (changed)| `"99.99"` |
| `unknown=(true)`| (initial, warning)| `<null>` |
| `unknown=(false)`| (initial, warning)| `<null>` |
| `unknown=(string 'true')`| (changed)| `"true"` |
| `unknown=(string 'false')`| (changed)| `"false"` |
| `unknown=(string 'on')`| (changed)| `"on"` |
| `unknown=(string 'off')`| (changed)| `"off"` |
| `unknown=(symbol)`| (initial, warning)| `<null>` |
| `unknown=(function)`| (initial, warning)| `<null>` |
| `unknown=(null)`| (initial)| `<null>` |
| `unknown=(undefined)`| (initial)| `<null>` |

## `unselectable` (on `<span>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `unselectable=(string)`| (changed)| `"on"` |
| `unselectable=(empty string)`| (changed)| `<empty string>` |
| `unselectable=(array with string)`| (changed)| `"on"` |
| `unselectable=(empty array)`| (changed)| `<empty string>` |
| `unselectable=(object)`| (changed)| `"result of toString()"` |
| `unselectable=(numeric string)`| (changed)| `"42"` |
| `unselectable=(-1)`| (changed)| `"-1"` |
| `unselectable=(0)`| (changed)| `"0"` |
| `unselectable=(integer)`| (changed)| `"1"` |
| `unselectable=(NaN)`| (changed, warning)| `"NaN"` |
| `unselectable=(float)`| (changed)| `"99.99"` |
| `unselectable=(true)`| (initial, warning)| `<null>` |
| `unselectable=(false)`| (initial, warning)| `<null>` |
| `unselectable=(string 'true')`| (changed)| `"true"` |
| `unselectable=(string 'false')`| (changed)| `"false"` |
| `unselectable=(string 'on')`| (changed)| `"on"` |
| `unselectable=(string 'off')`| (changed)| `"off"` |
| `unselectable=(symbol)`| (initial, warning)| `<null>` |
| `unselectable=(function)`| (initial, warning)| `<null>` |
| `unselectable=(null)`| (initial)| `<null>` |
| `unselectable=(undefined)`| (initial)| `<null>` |

## `useMap` (on `<img>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `useMap=(string)`| (changed)| `"a string"` |
| `useMap=(empty string)`| (initial)| `<empty string>` |
| `useMap=(array with string)`| (changed)| `"string"` |
| `useMap=(empty array)`| (initial)| `<empty string>` |
| `useMap=(object)`| (changed)| `"result of toString()"` |
| `useMap=(numeric string)`| (changed)| `"42"` |
| `useMap=(-1)`| (changed)| `"-1"` |
| `useMap=(0)`| (changed)| `"0"` |
| `useMap=(integer)`| (changed)| `"1"` |
| `useMap=(NaN)`| (changed, warning)| `"NaN"` |
| `useMap=(float)`| (changed)| `"99.99"` |
| `useMap=(true)`| (initial, warning)| `<empty string>` |
| `useMap=(false)`| (initial, warning)| `<empty string>` |
| `useMap=(string 'true')`| (changed)| `"true"` |
| `useMap=(string 'false')`| (changed)| `"false"` |
| `useMap=(string 'on')`| (changed)| `"on"` |
| `useMap=(string 'off')`| (changed)| `"off"` |
| `useMap=(symbol)`| (initial, warning)| `<empty string>` |
| `useMap=(function)`| (initial, warning)| `<empty string>` |
| `useMap=(null)`| (initial)| `<empty string>` |
| `useMap=(undefined)`| (initial)| `<empty string>` |

## `v-alphabetic` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `v-alphabetic=(string)`| (changed, warning)| `"a string"` |
| `v-alphabetic=(empty string)`| (changed, warning)| `<empty string>` |
| `v-alphabetic=(array with string)`| (changed, warning)| `"string"` |
| `v-alphabetic=(empty array)`| (changed, warning)| `<empty string>` |
| `v-alphabetic=(object)`| (changed, warning)| `"result of toString()"` |
| `v-alphabetic=(numeric string)`| (changed, warning)| `"42"` |
| `v-alphabetic=(-1)`| (changed, warning)| `"-1"` |
| `v-alphabetic=(0)`| (changed, warning)| `"0"` |
| `v-alphabetic=(integer)`| (changed, warning)| `"1"` |
| `v-alphabetic=(NaN)`| (changed, warning)| `"NaN"` |
| `v-alphabetic=(float)`| (changed, warning)| `"99.99"` |
| `v-alphabetic=(true)`| (initial, warning)| `<null>` |
| `v-alphabetic=(false)`| (initial, warning)| `<null>` |
| `v-alphabetic=(string 'true')`| (changed, warning)| `"true"` |
| `v-alphabetic=(string 'false')`| (changed, warning)| `"false"` |
| `v-alphabetic=(string 'on')`| (changed, warning)| `"on"` |
| `v-alphabetic=(string 'off')`| (changed, warning)| `"off"` |
| `v-alphabetic=(symbol)`| (initial, warning)| `<null>` |
| `v-alphabetic=(function)`| (initial, warning)| `<null>` |
| `v-alphabetic=(null)`| (initial, warning)| `<null>` |
| `v-alphabetic=(undefined)`| (initial, warning)| `<null>` |

## `v-hanging` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `v-hanging=(string)`| (changed, warning)| `"a string"` |
| `v-hanging=(empty string)`| (changed, warning)| `<empty string>` |
| `v-hanging=(array with string)`| (changed, warning)| `"string"` |
| `v-hanging=(empty array)`| (changed, warning)| `<empty string>` |
| `v-hanging=(object)`| (changed, warning)| `"result of toString()"` |
| `v-hanging=(numeric string)`| (changed, warning)| `"42"` |
| `v-hanging=(-1)`| (changed, warning)| `"-1"` |
| `v-hanging=(0)`| (changed, warning)| `"0"` |
| `v-hanging=(integer)`| (changed, warning)| `"1"` |
| `v-hanging=(NaN)`| (changed, warning)| `"NaN"` |
| `v-hanging=(float)`| (changed, warning)| `"99.99"` |
| `v-hanging=(true)`| (initial, warning)| `<null>` |
| `v-hanging=(false)`| (initial, warning)| `<null>` |
| `v-hanging=(string 'true')`| (changed, warning)| `"true"` |
| `v-hanging=(string 'false')`| (changed, warning)| `"false"` |
| `v-hanging=(string 'on')`| (changed, warning)| `"on"` |
| `v-hanging=(string 'off')`| (changed, warning)| `"off"` |
| `v-hanging=(symbol)`| (initial, warning)| `<null>` |
| `v-hanging=(function)`| (initial, warning)| `<null>` |
| `v-hanging=(null)`| (initial, warning)| `<null>` |
| `v-hanging=(undefined)`| (initial, warning)| `<null>` |

## `v-ideographic` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `v-ideographic=(string)`| (changed, warning)| `"a string"` |
| `v-ideographic=(empty string)`| (changed, warning)| `<empty string>` |
| `v-ideographic=(array with string)`| (changed, warning)| `"string"` |
| `v-ideographic=(empty array)`| (changed, warning)| `<empty string>` |
| `v-ideographic=(object)`| (changed, warning)| `"result of toString()"` |
| `v-ideographic=(numeric string)`| (changed, warning)| `"42"` |
| `v-ideographic=(-1)`| (changed, warning)| `"-1"` |
| `v-ideographic=(0)`| (changed, warning)| `"0"` |
| `v-ideographic=(integer)`| (changed, warning)| `"1"` |
| `v-ideographic=(NaN)`| (changed, warning)| `"NaN"` |
| `v-ideographic=(float)`| (changed, warning)| `"99.99"` |
| `v-ideographic=(true)`| (initial, warning)| `<null>` |
| `v-ideographic=(false)`| (initial, warning)| `<null>` |
| `v-ideographic=(string 'true')`| (changed, warning)| `"true"` |
| `v-ideographic=(string 'false')`| (changed, warning)| `"false"` |
| `v-ideographic=(string 'on')`| (changed, warning)| `"on"` |
| `v-ideographic=(string 'off')`| (changed, warning)| `"off"` |
| `v-ideographic=(symbol)`| (initial, warning)| `<null>` |
| `v-ideographic=(function)`| (initial, warning)| `<null>` |
| `v-ideographic=(null)`| (initial, warning)| `<null>` |
| `v-ideographic=(undefined)`| (initial, warning)| `<null>` |

## `v-mathematical` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `v-mathematical=(string)`| (changed, warning)| `"a string"` |
| `v-mathematical=(empty string)`| (changed, warning)| `<empty string>` |
| `v-mathematical=(array with string)`| (changed, warning)| `"string"` |
| `v-mathematical=(empty array)`| (changed, warning)| `<empty string>` |
| `v-mathematical=(object)`| (changed, warning)| `"result of toString()"` |
| `v-mathematical=(numeric string)`| (changed, warning)| `"42"` |
| `v-mathematical=(-1)`| (changed, warning)| `"-1"` |
| `v-mathematical=(0)`| (changed, warning)| `"0"` |
| `v-mathematical=(integer)`| (changed, warning)| `"1"` |
| `v-mathematical=(NaN)`| (changed, warning)| `"NaN"` |
| `v-mathematical=(float)`| (changed, warning)| `"99.99"` |
| `v-mathematical=(true)`| (initial, warning)| `<null>` |
| `v-mathematical=(false)`| (initial, warning)| `<null>` |
| `v-mathematical=(string 'true')`| (changed, warning)| `"true"` |
| `v-mathematical=(string 'false')`| (changed, warning)| `"false"` |
| `v-mathematical=(string 'on')`| (changed, warning)| `"on"` |
| `v-mathematical=(string 'off')`| (changed, warning)| `"off"` |
| `v-mathematical=(symbol)`| (initial, warning)| `<null>` |
| `v-mathematical=(function)`| (initial, warning)| `<null>` |
| `v-mathematical=(null)`| (initial, warning)| `<null>` |
| `v-mathematical=(undefined)`| (initial, warning)| `<null>` |

## `vAlphabetic` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vAlphabetic=(string)`| (changed)| `"a string"` |
| `vAlphabetic=(empty string)`| (changed)| `<empty string>` |
| `vAlphabetic=(array with string)`| (changed)| `"string"` |
| `vAlphabetic=(empty array)`| (changed)| `<empty string>` |
| `vAlphabetic=(object)`| (changed)| `"result of toString()"` |
| `vAlphabetic=(numeric string)`| (changed)| `"42"` |
| `vAlphabetic=(-1)`| (changed)| `"-1"` |
| `vAlphabetic=(0)`| (changed)| `"0"` |
| `vAlphabetic=(integer)`| (changed)| `"1"` |
| `vAlphabetic=(NaN)`| (changed, warning)| `"NaN"` |
| `vAlphabetic=(float)`| (changed)| `"99.99"` |
| `vAlphabetic=(true)`| (initial, warning)| `<null>` |
| `vAlphabetic=(false)`| (initial, warning)| `<null>` |
| `vAlphabetic=(string 'true')`| (changed)| `"true"` |
| `vAlphabetic=(string 'false')`| (changed)| `"false"` |
| `vAlphabetic=(string 'on')`| (changed)| `"on"` |
| `vAlphabetic=(string 'off')`| (changed)| `"off"` |
| `vAlphabetic=(symbol)`| (initial, warning)| `<null>` |
| `vAlphabetic=(function)`| (initial, warning)| `<null>` |
| `vAlphabetic=(null)`| (initial)| `<null>` |
| `vAlphabetic=(undefined)`| (initial)| `<null>` |

## `value` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `value=(string)`| (changed)| `"a string"` |
| `value=(empty string)`| (initial)| `<empty string>` |
| `value=(array with string)`| (changed)| `"string"` |
| `value=(empty array)`| (initial)| `<empty string>` |
| `value=(object)`| (changed)| `"result of toString()"` |
| `value=(numeric string)`| (changed)| `"42"` |
| `value=(-1)`| (changed)| `"-1"` |
| `value=(0)`| (changed)| `"0"` |
| `value=(integer)`| (changed)| `"1"` |
| `value=(NaN)`| (changed, warning)| `"NaN"` |
| `value=(float)`| (changed)| `"99.99"` |
| `value=(true)`| (changed)| `"true"` |
| `value=(false)`| (changed)| `"false"` |
| `value=(string 'true')`| (changed)| `"true"` |
| `value=(string 'false')`| (changed)| `"false"` |
| `value=(string 'on')`| (changed)| `"on"` |
| `value=(string 'off')`| (changed)| `"off"` |
| `value=(symbol)`| (initial, warning)| `<empty string>` |
| `value=(function)`| (initial, warning)| `<empty string>` |
| `value=(null)`| (initial, warning)| `<empty string>` |
| `value=(undefined)`| (initial)| `<empty string>` |

## `value` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `value=(string)`| (changed)| `"a string"` |
| `value=(empty string)`| (initial)| `<empty string>` |
| `value=(array with string)`| (changed)| `"string"` |
| `value=(empty array)`| (initial)| `<empty string>` |
| `value=(object)`| (changed)| `"result of toString()"` |
| `value=(numeric string)`| (changed)| `"42"` |
| `value=(-1)`| (changed)| `"-1"` |
| `value=(0)`| (changed)| `"0"` |
| `value=(integer)`| (changed)| `"1"` |
| `value=(NaN)`| (changed, warning)| `"NaN"` |
| `value=(float)`| (changed)| `"99.99"` |
| `value=(true)`| (changed)| `"true"` |
| `value=(false)`| (changed)| `"false"` |
| `value=(string 'true')`| (changed)| `"true"` |
| `value=(string 'false')`| (changed)| `"false"` |
| `value=(string 'on')`| (changed)| `"on"` |
| `value=(string 'off')`| (changed)| `"off"` |
| `value=(symbol)`| (initial, warning)| `<empty string>` |
| `value=(function)`| (initial, warning)| `<empty string>` |
| `value=(null)`| (initial, warning)| `<empty string>` |
| `value=(undefined)`| (initial)| `<empty string>` |

## `value` (on `<input>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `value=(string)`| (initial)| `<empty string>` |
| `value=(empty string)`| (initial)| `<empty string>` |
| `value=(array with string)`| (initial)| `<empty string>` |
| `value=(empty array)`| (initial)| `<empty string>` |
| `value=(object)`| (initial)| `<empty string>` |
| `value=(numeric string)`| (changed)| `"42"` |
| `value=(-1)`| (changed)| `"-1"` |
| `value=(0)`| (changed)| `"0"` |
| `value=(integer)`| (changed)| `"1"` |
| `value=(NaN)`| (initial, warning)| `<empty string>` |
| `value=(float)`| (changed)| `"99.99"` |
| `value=(true)`| (initial)| `<empty string>` |
| `value=(false)`| (initial)| `<empty string>` |
| `value=(string 'true')`| (initial)| `<empty string>` |
| `value=(string 'false')`| (initial)| `<empty string>` |
| `value=(string 'on')`| (initial)| `<empty string>` |
| `value=(string 'off')`| (initial)| `<empty string>` |
| `value=(symbol)`| (initial, warning)| `<empty string>` |
| `value=(function)`| (initial, warning)| `<empty string>` |
| `value=(null)`| (initial, warning)| `<empty string>` |
| `value=(undefined)`| (initial)| `<empty string>` |

## `value` (on `<textarea>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `value=(string)`| (changed)| `"a string"` |
| `value=(empty string)`| (initial)| `<empty string>` |
| `value=(array with string)`| (changed)| `"string"` |
| `value=(empty array)`| (initial)| `<empty string>` |
| `value=(object)`| (changed)| `"result of toString()"` |
| `value=(numeric string)`| (changed)| `"42"` |
| `value=(-1)`| (changed)| `"-1"` |
| `value=(0)`| (changed)| `"0"` |
| `value=(integer)`| (changed)| `"1"` |
| `value=(NaN)`| (changed, warning)| `"NaN"` |
| `value=(float)`| (changed)| `"99.99"` |
| `value=(true)`| (changed)| `"true"` |
| `value=(false)`| (changed)| `"false"` |
| `value=(string 'true')`| (changed)| `"true"` |
| `value=(string 'false')`| (changed)| `"false"` |
| `value=(string 'on')`| (changed)| `"on"` |
| `value=(string 'off')`| (changed)| `"off"` |
| `value=(symbol)`| (initial, warning, ssr error, ssr mismatch)| `<empty string>` |
| `value=(function)`| (initial, warning, ssr mismatch)| `<empty string>` |
| `value=(null)`| (initial, warning)| `<empty string>` |
| `value=(undefined)`| (initial)| `<empty string>` |

## `value` (on `<option>` inside `<select>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `value=(string)`| (changed)| `"a string"` |
| `value=(empty string)`| (initial)| `<empty string>` |
| `value=(array with string)`| (changed)| `"string"` |
| `value=(empty array)`| (initial)| `<empty string>` |
| `value=(object)`| (changed)| `"result of toString()"` |
| `value=(numeric string)`| (changed)| `"42"` |
| `value=(-1)`| (changed)| `"-1"` |
| `value=(0)`| (changed)| `"0"` |
| `value=(integer)`| (changed)| `"1"` |
| `value=(NaN)`| (changed, warning)| `"NaN"` |
| `value=(float)`| (changed)| `"99.99"` |
| `value=(true)`| (changed)| `"true"` |
| `value=(false)`| (changed)| `"false"` |
| `value=(string 'true')`| (changed)| `"true"` |
| `value=(string 'false')`| (changed)| `"false"` |
| `value=(string 'on')`| (changed)| `"on"` |
| `value=(string 'off')`| (changed)| `"off"` |
| `value=(symbol)`| (initial, warning)| `<empty string>` |
| `value=(function)`| (initial, warning)| `<empty string>` |
| `value=(null)`| (initial)| `<empty string>` |
| `value=(undefined)`| (initial)| `<empty string>` |

## `Value` (on `<option>` inside `<select>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `Value=(string)`| (changed, warning)| `"a string"` |
| `Value=(empty string)`| (initial, warning)| `<empty string>` |
| `Value=(array with string)`| (changed, warning)| `"string"` |
| `Value=(empty array)`| (initial, warning)| `<empty string>` |
| `Value=(object)`| (changed, warning)| `"result of toString()"` |
| `Value=(numeric string)`| (changed, warning)| `"42"` |
| `Value=(-1)`| (changed, warning)| `"-1"` |
| `Value=(0)`| (changed, warning)| `"0"` |
| `Value=(integer)`| (changed, warning)| `"1"` |
| `Value=(NaN)`| (changed, warning)| `"NaN"` |
| `Value=(float)`| (changed, warning)| `"99.99"` |
| `Value=(true)`| (initial, warning)| `<empty string>` |
| `Value=(false)`| (initial, warning)| `<empty string>` |
| `Value=(string 'true')`| (changed, warning)| `"true"` |
| `Value=(string 'false')`| (changed, warning)| `"false"` |
| `Value=(string 'on')`| (changed, warning)| `"on"` |
| `Value=(string 'off')`| (changed, warning)| `"off"` |
| `Value=(symbol)`| (initial, warning)| `<empty string>` |
| `Value=(function)`| (initial, warning)| `<empty string>` |
| `Value=(null)`| (initial, warning)| `<empty string>` |
| `Value=(undefined)`| (initial, warning)| `<empty string>` |

## `values` (on `<feColorMatrix>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `values=(string)`| (changed)| `[1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]` |
| `values=(empty string)`| (initial)| `[]` |
| `values=(array with string)`| (changed)| `[1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]` |
| `values=(empty array)`| (initial)| `[]` |
| `values=(object)`| (initial)| `[]` |
| `values=(numeric string)`| (changed)| `[42]` |
| `values=(-1)`| (changed)| `[-1]` |
| `values=(0)`| (changed)| `[0]` |
| `values=(integer)`| (changed)| `[1]` |
| `values=(NaN)`| (initial, warning)| `[]` |
| `values=(float)`| (changed)| `[99.98999786376953]` |
| `values=(true)`| (initial, warning)| `[]` |
| `values=(false)`| (initial, warning)| `[]` |
| `values=(string 'true')`| (initial)| `[]` |
| `values=(string 'false')`| (initial)| `[]` |
| `values=(string 'on')`| (initial)| `[]` |
| `values=(string 'off')`| (initial)| `[]` |
| `values=(symbol)`| (initial, warning)| `[]` |
| `values=(function)`| (initial, warning)| `[]` |
| `values=(null)`| (initial)| `[]` |
| `values=(undefined)`| (initial)| `[]` |

## `vector-effect` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vector-effect=(string)`| (changed, warning)| `"a string"` |
| `vector-effect=(empty string)`| (changed, warning)| `<empty string>` |
| `vector-effect=(array with string)`| (changed, warning)| `"string"` |
| `vector-effect=(empty array)`| (changed, warning)| `<empty string>` |
| `vector-effect=(object)`| (changed, warning)| `"result of toString()"` |
| `vector-effect=(numeric string)`| (changed, warning)| `"42"` |
| `vector-effect=(-1)`| (changed, warning)| `"-1"` |
| `vector-effect=(0)`| (changed, warning)| `"0"` |
| `vector-effect=(integer)`| (changed, warning)| `"1"` |
| `vector-effect=(NaN)`| (changed, warning)| `"NaN"` |
| `vector-effect=(float)`| (changed, warning)| `"99.99"` |
| `vector-effect=(true)`| (initial, warning)| `<null>` |
| `vector-effect=(false)`| (initial, warning)| `<null>` |
| `vector-effect=(string 'true')`| (changed, warning)| `"true"` |
| `vector-effect=(string 'false')`| (changed, warning)| `"false"` |
| `vector-effect=(string 'on')`| (changed, warning)| `"on"` |
| `vector-effect=(string 'off')`| (changed, warning)| `"off"` |
| `vector-effect=(symbol)`| (initial, warning)| `<null>` |
| `vector-effect=(function)`| (initial, warning)| `<null>` |
| `vector-effect=(null)`| (initial, warning)| `<null>` |
| `vector-effect=(undefined)`| (initial, warning)| `<null>` |

## `vectorEffect` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vectorEffect=(string)`| (changed)| `"a string"` |
| `vectorEffect=(empty string)`| (changed)| `<empty string>` |
| `vectorEffect=(array with string)`| (changed)| `"string"` |
| `vectorEffect=(empty array)`| (changed)| `<empty string>` |
| `vectorEffect=(object)`| (changed)| `"result of toString()"` |
| `vectorEffect=(numeric string)`| (changed)| `"42"` |
| `vectorEffect=(-1)`| (changed)| `"-1"` |
| `vectorEffect=(0)`| (changed)| `"0"` |
| `vectorEffect=(integer)`| (changed)| `"1"` |
| `vectorEffect=(NaN)`| (changed, warning)| `"NaN"` |
| `vectorEffect=(float)`| (changed)| `"99.99"` |
| `vectorEffect=(true)`| (initial, warning)| `<null>` |
| `vectorEffect=(false)`| (initial, warning)| `<null>` |
| `vectorEffect=(string 'true')`| (changed)| `"true"` |
| `vectorEffect=(string 'false')`| (changed)| `"false"` |
| `vectorEffect=(string 'on')`| (changed)| `"on"` |
| `vectorEffect=(string 'off')`| (changed)| `"off"` |
| `vectorEffect=(symbol)`| (initial, warning)| `<null>` |
| `vectorEffect=(function)`| (initial, warning)| `<null>` |
| `vectorEffect=(null)`| (initial)| `<null>` |
| `vectorEffect=(undefined)`| (initial)| `<null>` |

## `version` (on `<html>` inside `<document>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `version=(string)`| (changed, ssr mismatch)| `"a string"` |
| `version=(empty string)`| (initial)| `<empty string>` |
| `version=(array with string)`| (changed, ssr mismatch)| `"string"` |
| `version=(empty array)`| (initial)| `<empty string>` |
| `version=(object)`| (changed, ssr mismatch)| `"result of toString()"` |
| `version=(numeric string)`| (changed, ssr mismatch)| `"42"` |
| `version=(-1)`| (changed, ssr mismatch)| `"-1"` |
| `version=(0)`| (changed, ssr mismatch)| `"0"` |
| `version=(integer)`| (changed, ssr mismatch)| `"1"` |
| `version=(NaN)`| (changed, warning, ssr mismatch)| `"NaN"` |
| `version=(float)`| (changed, ssr mismatch)| `"99.99"` |
| `version=(true)`| (initial, warning)| `<empty string>` |
| `version=(false)`| (initial, warning)| `<empty string>` |
| `version=(string 'true')`| (changed, ssr mismatch)| `"true"` |
| `version=(string 'false')`| (changed, ssr mismatch)| `"false"` |
| `version=(string 'on')`| (changed, ssr mismatch)| `"on"` |
| `version=(string 'off')`| (changed, ssr mismatch)| `"off"` |
| `version=(symbol)`| (initial, warning)| `<empty string>` |
| `version=(function)`| (initial, warning)| `<empty string>` |
| `version=(null)`| (initial)| `<empty string>` |
| `version=(undefined)`| (initial)| `<empty string>` |

## `version` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `version=(string)`| (changed)| `"a string"` |
| `version=(empty string)`| (changed)| `<empty string>` |
| `version=(array with string)`| (changed)| `"string"` |
| `version=(empty array)`| (changed)| `<empty string>` |
| `version=(object)`| (changed)| `"result of toString()"` |
| `version=(numeric string)`| (changed)| `"42"` |
| `version=(-1)`| (changed)| `"-1"` |
| `version=(0)`| (changed)| `"0"` |
| `version=(integer)`| (changed)| `"1"` |
| `version=(NaN)`| (changed, warning)| `"NaN"` |
| `version=(float)`| (changed)| `"99.99"` |
| `version=(true)`| (initial, warning)| `<null>` |
| `version=(false)`| (initial, warning)| `<null>` |
| `version=(string 'true')`| (changed)| `"true"` |
| `version=(string 'false')`| (changed)| `"false"` |
| `version=(string 'on')`| (changed)| `"on"` |
| `version=(string 'off')`| (changed)| `"off"` |
| `version=(symbol)`| (initial, warning)| `<null>` |
| `version=(function)`| (initial, warning)| `<null>` |
| `version=(null)`| (initial)| `<null>` |
| `version=(undefined)`| (initial)| `<null>` |

## `vert-adv-y` (on `<font>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vert-adv-y=(string)`| (initial, warning)| `<null>` |
| `vert-adv-y=(empty string)`| (initial, warning)| `<null>` |
| `vert-adv-y=(array with string)`| (initial, warning)| `<null>` |
| `vert-adv-y=(empty array)`| (initial, warning)| `<null>` |
| `vert-adv-y=(object)`| (initial, warning)| `<null>` |
| `vert-adv-y=(numeric string)`| (initial, warning)| `<null>` |
| `vert-adv-y=(-1)`| (initial, warning)| `<null>` |
| `vert-adv-y=(0)`| (initial, warning)| `<null>` |
| `vert-adv-y=(integer)`| (initial, warning)| `<null>` |
| `vert-adv-y=(NaN)`| (initial, warning)| `<null>` |
| `vert-adv-y=(float)`| (initial, warning)| `<null>` |
| `vert-adv-y=(true)`| (initial, warning)| `<null>` |
| `vert-adv-y=(false)`| (initial, warning)| `<null>` |
| `vert-adv-y=(string 'true')`| (initial, warning)| `<null>` |
| `vert-adv-y=(string 'false')`| (initial, warning)| `<null>` |
| `vert-adv-y=(string 'on')`| (initial, warning)| `<null>` |
| `vert-adv-y=(string 'off')`| (initial, warning)| `<null>` |
| `vert-adv-y=(symbol)`| (initial, warning)| `<null>` |
| `vert-adv-y=(function)`| (initial, warning)| `<null>` |
| `vert-adv-y=(null)`| (initial, warning)| `<null>` |
| `vert-adv-y=(undefined)`| (initial, warning)| `<null>` |

## `vert-origin-x` (on `<font>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vert-origin-x=(string)`| (initial, warning)| `<null>` |
| `vert-origin-x=(empty string)`| (initial, warning)| `<null>` |
| `vert-origin-x=(array with string)`| (initial, warning)| `<null>` |
| `vert-origin-x=(empty array)`| (initial, warning)| `<null>` |
| `vert-origin-x=(object)`| (initial, warning)| `<null>` |
| `vert-origin-x=(numeric string)`| (initial, warning)| `<null>` |
| `vert-origin-x=(-1)`| (initial, warning)| `<null>` |
| `vert-origin-x=(0)`| (initial, warning)| `<null>` |
| `vert-origin-x=(integer)`| (initial, warning)| `<null>` |
| `vert-origin-x=(NaN)`| (initial, warning)| `<null>` |
| `vert-origin-x=(float)`| (initial, warning)| `<null>` |
| `vert-origin-x=(true)`| (initial, warning)| `<null>` |
| `vert-origin-x=(false)`| (initial, warning)| `<null>` |
| `vert-origin-x=(string 'true')`| (initial, warning)| `<null>` |
| `vert-origin-x=(string 'false')`| (initial, warning)| `<null>` |
| `vert-origin-x=(string 'on')`| (initial, warning)| `<null>` |
| `vert-origin-x=(string 'off')`| (initial, warning)| `<null>` |
| `vert-origin-x=(symbol)`| (initial, warning)| `<null>` |
| `vert-origin-x=(function)`| (initial, warning)| `<null>` |
| `vert-origin-x=(null)`| (initial, warning)| `<null>` |
| `vert-origin-x=(undefined)`| (initial, warning)| `<null>` |

## `vert-origin-y` (on `<font>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vert-origin-y=(string)`| (changed, warning)| `"a string"` |
| `vert-origin-y=(empty string)`| (changed, warning)| `<empty string>` |
| `vert-origin-y=(array with string)`| (changed, warning)| `"string"` |
| `vert-origin-y=(empty array)`| (changed, warning)| `<empty string>` |
| `vert-origin-y=(object)`| (changed, warning)| `"result of toString()"` |
| `vert-origin-y=(numeric string)`| (changed, warning)| `"42"` |
| `vert-origin-y=(-1)`| (changed, warning)| `"-1"` |
| `vert-origin-y=(0)`| (changed, warning)| `"0"` |
| `vert-origin-y=(integer)`| (changed, warning)| `"1"` |
| `vert-origin-y=(NaN)`| (changed, warning)| `"NaN"` |
| `vert-origin-y=(float)`| (changed, warning)| `"99.99"` |
| `vert-origin-y=(true)`| (initial, warning)| `<null>` |
| `vert-origin-y=(false)`| (initial, warning)| `<null>` |
| `vert-origin-y=(string 'true')`| (changed, warning)| `"true"` |
| `vert-origin-y=(string 'false')`| (changed, warning)| `"false"` |
| `vert-origin-y=(string 'on')`| (changed, warning)| `"on"` |
| `vert-origin-y=(string 'off')`| (changed, warning)| `"off"` |
| `vert-origin-y=(symbol)`| (initial, warning)| `<null>` |
| `vert-origin-y=(function)`| (initial, warning)| `<null>` |
| `vert-origin-y=(null)`| (initial, warning)| `<null>` |
| `vert-origin-y=(undefined)`| (initial, warning)| `<null>` |

## `vertAdvY` (on `<font>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vertAdvY=(string)`| (changed)| `"a string"` |
| `vertAdvY=(empty string)`| (changed)| `<empty string>` |
| `vertAdvY=(array with string)`| (changed)| `"string"` |
| `vertAdvY=(empty array)`| (changed)| `<empty string>` |
| `vertAdvY=(object)`| (changed)| `"result of toString()"` |
| `vertAdvY=(numeric string)`| (changed)| `"42"` |
| `vertAdvY=(-1)`| (changed)| `"-1"` |
| `vertAdvY=(0)`| (changed)| `"0"` |
| `vertAdvY=(integer)`| (changed)| `"1"` |
| `vertAdvY=(NaN)`| (changed, warning)| `"NaN"` |
| `vertAdvY=(float)`| (changed)| `"99.99"` |
| `vertAdvY=(true)`| (initial, warning)| `<null>` |
| `vertAdvY=(false)`| (initial, warning)| `<null>` |
| `vertAdvY=(string 'true')`| (changed)| `"true"` |
| `vertAdvY=(string 'false')`| (changed)| `"false"` |
| `vertAdvY=(string 'on')`| (changed)| `"on"` |
| `vertAdvY=(string 'off')`| (changed)| `"off"` |
| `vertAdvY=(symbol)`| (initial, warning)| `<null>` |
| `vertAdvY=(function)`| (initial, warning)| `<null>` |
| `vertAdvY=(null)`| (initial)| `<null>` |
| `vertAdvY=(undefined)`| (initial)| `<null>` |

## `vertOriginX` (on `<font>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vertOriginX=(string)`| (changed)| `"a string"` |
| `vertOriginX=(empty string)`| (changed)| `<empty string>` |
| `vertOriginX=(array with string)`| (changed)| `"string"` |
| `vertOriginX=(empty array)`| (changed)| `<empty string>` |
| `vertOriginX=(object)`| (changed)| `"result of toString()"` |
| `vertOriginX=(numeric string)`| (changed)| `"42"` |
| `vertOriginX=(-1)`| (changed)| `"-1"` |
| `vertOriginX=(0)`| (changed)| `"0"` |
| `vertOriginX=(integer)`| (changed)| `"1"` |
| `vertOriginX=(NaN)`| (changed, warning)| `"NaN"` |
| `vertOriginX=(float)`| (changed)| `"99.99"` |
| `vertOriginX=(true)`| (initial, warning)| `<null>` |
| `vertOriginX=(false)`| (initial, warning)| `<null>` |
| `vertOriginX=(string 'true')`| (changed)| `"true"` |
| `vertOriginX=(string 'false')`| (changed)| `"false"` |
| `vertOriginX=(string 'on')`| (changed)| `"on"` |
| `vertOriginX=(string 'off')`| (changed)| `"off"` |
| `vertOriginX=(symbol)`| (initial, warning)| `<null>` |
| `vertOriginX=(function)`| (initial, warning)| `<null>` |
| `vertOriginX=(null)`| (initial)| `<null>` |
| `vertOriginX=(undefined)`| (initial)| `<null>` |

## `vertOriginY` (on `<font>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vertOriginY=(string)`| (changed)| `"a string"` |
| `vertOriginY=(empty string)`| (changed)| `<empty string>` |
| `vertOriginY=(array with string)`| (changed)| `"string"` |
| `vertOriginY=(empty array)`| (changed)| `<empty string>` |
| `vertOriginY=(object)`| (changed)| `"result of toString()"` |
| `vertOriginY=(numeric string)`| (changed)| `"42"` |
| `vertOriginY=(-1)`| (changed)| `"-1"` |
| `vertOriginY=(0)`| (changed)| `"0"` |
| `vertOriginY=(integer)`| (changed)| `"1"` |
| `vertOriginY=(NaN)`| (changed, warning)| `"NaN"` |
| `vertOriginY=(float)`| (changed)| `"99.99"` |
| `vertOriginY=(true)`| (initial, warning)| `<null>` |
| `vertOriginY=(false)`| (initial, warning)| `<null>` |
| `vertOriginY=(string 'true')`| (changed)| `"true"` |
| `vertOriginY=(string 'false')`| (changed)| `"false"` |
| `vertOriginY=(string 'on')`| (changed)| `"on"` |
| `vertOriginY=(string 'off')`| (changed)| `"off"` |
| `vertOriginY=(symbol)`| (initial, warning)| `<null>` |
| `vertOriginY=(function)`| (initial, warning)| `<null>` |
| `vertOriginY=(null)`| (initial)| `<null>` |
| `vertOriginY=(undefined)`| (initial)| `<null>` |

## `vHanging` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vHanging=(string)`| (changed)| `"a string"` |
| `vHanging=(empty string)`| (changed)| `<empty string>` |
| `vHanging=(array with string)`| (changed)| `"string"` |
| `vHanging=(empty array)`| (changed)| `<empty string>` |
| `vHanging=(object)`| (changed)| `"result of toString()"` |
| `vHanging=(numeric string)`| (changed)| `"42"` |
| `vHanging=(-1)`| (changed)| `"-1"` |
| `vHanging=(0)`| (changed)| `"0"` |
| `vHanging=(integer)`| (changed)| `"1"` |
| `vHanging=(NaN)`| (changed, warning)| `"NaN"` |
| `vHanging=(float)`| (changed)| `"99.99"` |
| `vHanging=(true)`| (initial, warning)| `<null>` |
| `vHanging=(false)`| (initial, warning)| `<null>` |
| `vHanging=(string 'true')`| (changed)| `"true"` |
| `vHanging=(string 'false')`| (changed)| `"false"` |
| `vHanging=(string 'on')`| (changed)| `"on"` |
| `vHanging=(string 'off')`| (changed)| `"off"` |
| `vHanging=(symbol)`| (initial, warning)| `<null>` |
| `vHanging=(function)`| (initial, warning)| `<null>` |
| `vHanging=(null)`| (initial)| `<null>` |
| `vHanging=(undefined)`| (initial)| `<null>` |

## `vIdeographic` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vIdeographic=(string)`| (changed)| `"a string"` |
| `vIdeographic=(empty string)`| (changed)| `<empty string>` |
| `vIdeographic=(array with string)`| (changed)| `"string"` |
| `vIdeographic=(empty array)`| (changed)| `<empty string>` |
| `vIdeographic=(object)`| (changed)| `"result of toString()"` |
| `vIdeographic=(numeric string)`| (changed)| `"42"` |
| `vIdeographic=(-1)`| (changed)| `"-1"` |
| `vIdeographic=(0)`| (changed)| `"0"` |
| `vIdeographic=(integer)`| (changed)| `"1"` |
| `vIdeographic=(NaN)`| (changed, warning)| `"NaN"` |
| `vIdeographic=(float)`| (changed)| `"99.99"` |
| `vIdeographic=(true)`| (initial, warning)| `<null>` |
| `vIdeographic=(false)`| (initial, warning)| `<null>` |
| `vIdeographic=(string 'true')`| (changed)| `"true"` |
| `vIdeographic=(string 'false')`| (changed)| `"false"` |
| `vIdeographic=(string 'on')`| (changed)| `"on"` |
| `vIdeographic=(string 'off')`| (changed)| `"off"` |
| `vIdeographic=(symbol)`| (initial, warning)| `<null>` |
| `vIdeographic=(function)`| (initial, warning)| `<null>` |
| `vIdeographic=(null)`| (initial)| `<null>` |
| `vIdeographic=(undefined)`| (initial)| `<null>` |

## `viewBox` (on `<marker>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `viewBox=(string)`| (changed)| `<SVGRect: 0,0,1500,1000>` |
| `viewBox=(empty string)`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(array with string)`| (changed)| `<SVGRect: 0,0,1500,1000>` |
| `viewBox=(empty array)`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(object)`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(numeric string)`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(-1)`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(0)`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(integer)`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(NaN)`| (initial, warning)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(float)`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(true)`| (initial, warning)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(false)`| (initial, warning)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(string 'true')`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(string 'false')`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(string 'on')`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(string 'off')`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(symbol)`| (initial, warning)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(function)`| (initial, warning)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(null)`| (initial)| `<SVGRect: 0,0,0,0>` |
| `viewBox=(undefined)`| (initial)| `<SVGRect: 0,0,0,0>` |

## `viewTarget` (on `<view>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `viewTarget=(string)`| (changed)| `"a string"` |
| `viewTarget=(empty string)`| (changed)| `<empty string>` |
| `viewTarget=(array with string)`| (changed)| `"string"` |
| `viewTarget=(empty array)`| (changed)| `<empty string>` |
| `viewTarget=(object)`| (changed)| `"result of toString()"` |
| `viewTarget=(numeric string)`| (changed)| `"42"` |
| `viewTarget=(-1)`| (changed)| `"-1"` |
| `viewTarget=(0)`| (changed)| `"0"` |
| `viewTarget=(integer)`| (changed)| `"1"` |
| `viewTarget=(NaN)`| (changed, warning)| `"NaN"` |
| `viewTarget=(float)`| (changed)| `"99.99"` |
| `viewTarget=(true)`| (initial, warning)| `<null>` |
| `viewTarget=(false)`| (initial, warning)| `<null>` |
| `viewTarget=(string 'true')`| (changed)| `"true"` |
| `viewTarget=(string 'false')`| (changed)| `"false"` |
| `viewTarget=(string 'on')`| (changed)| `"on"` |
| `viewTarget=(string 'off')`| (changed)| `"off"` |
| `viewTarget=(symbol)`| (initial, warning)| `<null>` |
| `viewTarget=(function)`| (initial, warning)| `<null>` |
| `viewTarget=(null)`| (initial)| `<null>` |
| `viewTarget=(undefined)`| (initial)| `<null>` |

## `visibility` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `visibility=(string)`| (changed)| `"a string"` |
| `visibility=(empty string)`| (changed)| `<empty string>` |
| `visibility=(array with string)`| (changed)| `"string"` |
| `visibility=(empty array)`| (changed)| `<empty string>` |
| `visibility=(object)`| (changed)| `"result of toString()"` |
| `visibility=(numeric string)`| (changed)| `"42"` |
| `visibility=(-1)`| (changed)| `"-1"` |
| `visibility=(0)`| (changed)| `"0"` |
| `visibility=(integer)`| (changed)| `"1"` |
| `visibility=(NaN)`| (changed, warning)| `"NaN"` |
| `visibility=(float)`| (changed)| `"99.99"` |
| `visibility=(true)`| (initial, warning)| `<null>` |
| `visibility=(false)`| (initial, warning)| `<null>` |
| `visibility=(string 'true')`| (changed)| `"true"` |
| `visibility=(string 'false')`| (changed)| `"false"` |
| `visibility=(string 'on')`| (changed)| `"on"` |
| `visibility=(string 'off')`| (changed)| `"off"` |
| `visibility=(symbol)`| (initial, warning)| `<null>` |
| `visibility=(function)`| (initial, warning)| `<null>` |
| `visibility=(null)`| (initial)| `<null>` |
| `visibility=(undefined)`| (initial)| `<null>` |

## `visibility` (on `<path>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `visibility=(string)`| (changed)| `"a string"` |
| `visibility=(empty string)`| (changed)| `<empty string>` |
| `visibility=(array with string)`| (changed)| `"string"` |
| `visibility=(empty array)`| (changed)| `<empty string>` |
| `visibility=(object)`| (changed)| `"result of toString()"` |
| `visibility=(numeric string)`| (changed)| `"42"` |
| `visibility=(-1)`| (changed)| `"-1"` |
| `visibility=(0)`| (changed)| `"0"` |
| `visibility=(integer)`| (changed)| `"1"` |
| `visibility=(NaN)`| (changed, warning)| `"NaN"` |
| `visibility=(float)`| (changed)| `"99.99"` |
| `visibility=(true)`| (initial, warning)| `<null>` |
| `visibility=(false)`| (initial, warning)| `<null>` |
| `visibility=(string 'true')`| (changed)| `"true"` |
| `visibility=(string 'false')`| (changed)| `"false"` |
| `visibility=(string 'on')`| (changed)| `"on"` |
| `visibility=(string 'off')`| (changed)| `"off"` |
| `visibility=(symbol)`| (initial, warning)| `<null>` |
| `visibility=(function)`| (initial, warning)| `<null>` |
| `visibility=(null)`| (initial)| `<null>` |
| `visibility=(undefined)`| (initial)| `<null>` |

## `vMathematical` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vMathematical=(string)`| (changed)| `"a string"` |
| `vMathematical=(empty string)`| (changed)| `<empty string>` |
| `vMathematical=(array with string)`| (changed)| `"string"` |
| `vMathematical=(empty array)`| (changed)| `<empty string>` |
| `vMathematical=(object)`| (changed)| `"result of toString()"` |
| `vMathematical=(numeric string)`| (changed)| `"42"` |
| `vMathematical=(-1)`| (changed)| `"-1"` |
| `vMathematical=(0)`| (changed)| `"0"` |
| `vMathematical=(integer)`| (changed)| `"1"` |
| `vMathematical=(NaN)`| (changed, warning)| `"NaN"` |
| `vMathematical=(float)`| (changed)| `"99.99"` |
| `vMathematical=(true)`| (initial, warning)| `<null>` |
| `vMathematical=(false)`| (initial, warning)| `<null>` |
| `vMathematical=(string 'true')`| (changed)| `"true"` |
| `vMathematical=(string 'false')`| (changed)| `"false"` |
| `vMathematical=(string 'on')`| (changed)| `"on"` |
| `vMathematical=(string 'off')`| (changed)| `"off"` |
| `vMathematical=(symbol)`| (initial, warning)| `<null>` |
| `vMathematical=(function)`| (initial, warning)| `<null>` |
| `vMathematical=(null)`| (initial)| `<null>` |
| `vMathematical=(undefined)`| (initial)| `<null>` |

## `vocab` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `vocab=(string)`| (changed)| `"a string"` |
| `vocab=(empty string)`| (changed)| `<empty string>` |
| `vocab=(array with string)`| (changed)| `"string"` |
| `vocab=(empty array)`| (changed)| `<empty string>` |
| `vocab=(object)`| (changed)| `"result of toString()"` |
| `vocab=(numeric string)`| (changed)| `"42"` |
| `vocab=(-1)`| (changed)| `"-1"` |
| `vocab=(0)`| (changed)| `"0"` |
| `vocab=(integer)`| (changed)| `"1"` |
| `vocab=(NaN)`| (changed, warning)| `"NaN"` |
| `vocab=(float)`| (changed)| `"99.99"` |
| `vocab=(true)`| (initial, warning)| `<null>` |
| `vocab=(false)`| (initial, warning)| `<null>` |
| `vocab=(string 'true')`| (changed)| `"true"` |
| `vocab=(string 'false')`| (changed)| `"false"` |
| `vocab=(string 'on')`| (changed)| `"on"` |
| `vocab=(string 'off')`| (changed)| `"off"` |
| `vocab=(symbol)`| (initial, warning)| `<null>` |
| `vocab=(function)`| (initial, warning)| `<null>` |
| `vocab=(null)`| (initial)| `<null>` |
| `vocab=(undefined)`| (initial)| `<null>` |

## `width` (on `<img>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `width=(string)`| (initial)| `<number: 0>` |
| `width=(empty string)`| (initial)| `<number: 0>` |
| `width=(array with string)`| (initial)| `<number: 0>` |
| `width=(empty array)`| (initial)| `<number: 0>` |
| `width=(object)`| (initial)| `<number: 0>` |
| `width=(numeric string)`| (changed)| `<number: 42>` |
| `width=(-1)`| (initial)| `<number: 0>` |
| `width=(0)`| (initial)| `<number: 0>` |
| `width=(integer)`| (changed)| `<number: 1>` |
| `width=(NaN)`| (initial, warning)| `<number: 0>` |
| `width=(float)`| (changed)| `<number: 99>` |
| `width=(true)`| (initial, warning)| `<number: 0>` |
| `width=(false)`| (initial, warning)| `<number: 0>` |
| `width=(string 'true')`| (initial)| `<number: 0>` |
| `width=(string 'false')`| (initial)| `<number: 0>` |
| `width=(string 'on')`| (initial)| `<number: 0>` |
| `width=(string 'off')`| (initial)| `<number: 0>` |
| `width=(symbol)`| (initial, warning)| `<number: 0>` |
| `width=(function)`| (initial, warning)| `<number: 0>` |
| `width=(null)`| (initial)| `<number: 0>` |
| `width=(undefined)`| (initial)| `<number: 0>` |

## `width` (on `<rect>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `width=(string)`| (initial)| `<SVGLength: 0>` |
| `width=(empty string)`| (initial)| `<SVGLength: 0>` |
| `width=(array with string)`| (initial)| `<SVGLength: 0>` |
| `width=(empty array)`| (initial)| `<SVGLength: 0>` |
| `width=(object)`| (initial)| `<SVGLength: 0>` |
| `width=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `width=(-1)`| (changed)| `<SVGLength: -1>` |
| `width=(0)`| (initial)| `<SVGLength: 0>` |
| `width=(integer)`| (changed)| `<SVGLength: 1>` |
| `width=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `width=(float)`| (changed)| `<SVGLength: 99.99>` |
| `width=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `width=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `width=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `width=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `width=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `width=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `width=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `width=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `width=(null)`| (initial)| `<SVGLength: 0>` |
| `width=(undefined)`| (initial)| `<SVGLength: 0>` |

## `widths` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `widths=(string)`| (changed)| `"a string"` |
| `widths=(empty string)`| (changed)| `<empty string>` |
| `widths=(array with string)`| (changed)| `"string"` |
| `widths=(empty array)`| (changed)| `<empty string>` |
| `widths=(object)`| (changed)| `"result of toString()"` |
| `widths=(numeric string)`| (changed)| `"42"` |
| `widths=(-1)`| (changed)| `"-1"` |
| `widths=(0)`| (changed)| `"0"` |
| `widths=(integer)`| (changed)| `"1"` |
| `widths=(NaN)`| (changed, warning)| `"NaN"` |
| `widths=(float)`| (changed)| `"99.99"` |
| `widths=(true)`| (initial, warning)| `<null>` |
| `widths=(false)`| (initial, warning)| `<null>` |
| `widths=(string 'true')`| (changed)| `"true"` |
| `widths=(string 'false')`| (changed)| `"false"` |
| `widths=(string 'on')`| (changed)| `"on"` |
| `widths=(string 'off')`| (changed)| `"off"` |
| `widths=(symbol)`| (initial, warning)| `<null>` |
| `widths=(function)`| (initial, warning)| `<null>` |
| `widths=(null)`| (initial)| `<null>` |
| `widths=(undefined)`| (initial)| `<null>` |

## `wmode` (on `<embed>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `wmode=(string)`| (changed)| `"a string"` |
| `wmode=(empty string)`| (changed)| `<empty string>` |
| `wmode=(array with string)`| (changed)| `"string"` |
| `wmode=(empty array)`| (changed)| `<empty string>` |
| `wmode=(object)`| (changed)| `"result of toString()"` |
| `wmode=(numeric string)`| (changed)| `"42"` |
| `wmode=(-1)`| (changed)| `"-1"` |
| `wmode=(0)`| (changed)| `"0"` |
| `wmode=(integer)`| (changed)| `"1"` |
| `wmode=(NaN)`| (changed, warning)| `"NaN"` |
| `wmode=(float)`| (changed)| `"99.99"` |
| `wmode=(true)`| (initial, warning)| `<null>` |
| `wmode=(false)`| (initial, warning)| `<null>` |
| `wmode=(string 'true')`| (changed)| `"true"` |
| `wmode=(string 'false')`| (changed)| `"false"` |
| `wmode=(string 'on')`| (changed)| `"on"` |
| `wmode=(string 'off')`| (changed)| `"off"` |
| `wmode=(symbol)`| (initial, warning)| `<null>` |
| `wmode=(function)`| (initial, warning)| `<null>` |
| `wmode=(null)`| (initial)| `<null>` |
| `wmode=(undefined)`| (initial)| `<null>` |

## `word-spacing` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `word-spacing=(string)`| (changed, warning)| `"a string"` |
| `word-spacing=(empty string)`| (changed, warning)| `<empty string>` |
| `word-spacing=(array with string)`| (changed, warning)| `"string"` |
| `word-spacing=(empty array)`| (changed, warning)| `<empty string>` |
| `word-spacing=(object)`| (changed, warning)| `"result of toString()"` |
| `word-spacing=(numeric string)`| (changed, warning)| `"42"` |
| `word-spacing=(-1)`| (changed, warning)| `"-1"` |
| `word-spacing=(0)`| (changed, warning)| `"0"` |
| `word-spacing=(integer)`| (changed, warning)| `"1"` |
| `word-spacing=(NaN)`| (changed, warning)| `"NaN"` |
| `word-spacing=(float)`| (changed, warning)| `"99.99"` |
| `word-spacing=(true)`| (initial, warning)| `<null>` |
| `word-spacing=(false)`| (initial, warning)| `<null>` |
| `word-spacing=(string 'true')`| (changed, warning)| `"true"` |
| `word-spacing=(string 'false')`| (changed, warning)| `"false"` |
| `word-spacing=(string 'on')`| (changed, warning)| `"on"` |
| `word-spacing=(string 'off')`| (changed, warning)| `"off"` |
| `word-spacing=(symbol)`| (initial, warning)| `<null>` |
| `word-spacing=(function)`| (initial, warning)| `<null>` |
| `word-spacing=(null)`| (initial, warning)| `<null>` |
| `word-spacing=(undefined)`| (initial, warning)| `<null>` |

## `wordSpacing` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `wordSpacing=(string)`| (changed)| `"a string"` |
| `wordSpacing=(empty string)`| (changed)| `<empty string>` |
| `wordSpacing=(array with string)`| (changed)| `"string"` |
| `wordSpacing=(empty array)`| (changed)| `<empty string>` |
| `wordSpacing=(object)`| (changed)| `"result of toString()"` |
| `wordSpacing=(numeric string)`| (changed)| `"42"` |
| `wordSpacing=(-1)`| (changed)| `"-1"` |
| `wordSpacing=(0)`| (changed)| `"0"` |
| `wordSpacing=(integer)`| (changed)| `"1"` |
| `wordSpacing=(NaN)`| (changed, warning)| `"NaN"` |
| `wordSpacing=(float)`| (changed)| `"99.99"` |
| `wordSpacing=(true)`| (initial, warning)| `<null>` |
| `wordSpacing=(false)`| (initial, warning)| `<null>` |
| `wordSpacing=(string 'true')`| (changed)| `"true"` |
| `wordSpacing=(string 'false')`| (changed)| `"false"` |
| `wordSpacing=(string 'on')`| (changed)| `"on"` |
| `wordSpacing=(string 'off')`| (changed)| `"off"` |
| `wordSpacing=(symbol)`| (initial, warning)| `<null>` |
| `wordSpacing=(function)`| (initial, warning)| `<null>` |
| `wordSpacing=(null)`| (initial)| `<null>` |
| `wordSpacing=(undefined)`| (initial)| `<null>` |

## `wrap` (on `<textarea>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `wrap=(string)`| (changed)| `"a string"` |
| `wrap=(empty string)`| (initial)| `<empty string>` |
| `wrap=(array with string)`| (changed)| `"string"` |
| `wrap=(empty array)`| (initial)| `<empty string>` |
| `wrap=(object)`| (changed)| `"result of toString()"` |
| `wrap=(numeric string)`| (changed)| `"42"` |
| `wrap=(-1)`| (changed)| `"-1"` |
| `wrap=(0)`| (changed)| `"0"` |
| `wrap=(integer)`| (changed)| `"1"` |
| `wrap=(NaN)`| (changed, warning)| `"NaN"` |
| `wrap=(float)`| (changed)| `"99.99"` |
| `wrap=(true)`| (initial, warning)| `<empty string>` |
| `wrap=(false)`| (initial, warning)| `<empty string>` |
| `wrap=(string 'true')`| (changed)| `"true"` |
| `wrap=(string 'false')`| (changed)| `"false"` |
| `wrap=(string 'on')`| (changed)| `"on"` |
| `wrap=(string 'off')`| (changed)| `"off"` |
| `wrap=(symbol)`| (initial, warning)| `<empty string>` |
| `wrap=(function)`| (initial, warning)| `<empty string>` |
| `wrap=(null)`| (initial)| `<empty string>` |
| `wrap=(undefined)`| (initial)| `<empty string>` |

## `writing-mode` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `writing-mode=(string)`| (changed, warning)| `"a string"` |
| `writing-mode=(empty string)`| (changed, warning)| `<empty string>` |
| `writing-mode=(array with string)`| (changed, warning)| `"string"` |
| `writing-mode=(empty array)`| (changed, warning)| `<empty string>` |
| `writing-mode=(object)`| (changed, warning)| `"result of toString()"` |
| `writing-mode=(numeric string)`| (changed, warning)| `"42"` |
| `writing-mode=(-1)`| (changed, warning)| `"-1"` |
| `writing-mode=(0)`| (changed, warning)| `"0"` |
| `writing-mode=(integer)`| (changed, warning)| `"1"` |
| `writing-mode=(NaN)`| (changed, warning)| `"NaN"` |
| `writing-mode=(float)`| (changed, warning)| `"99.99"` |
| `writing-mode=(true)`| (initial, warning)| `<null>` |
| `writing-mode=(false)`| (initial, warning)| `<null>` |
| `writing-mode=(string 'true')`| (changed, warning)| `"true"` |
| `writing-mode=(string 'false')`| (changed, warning)| `"false"` |
| `writing-mode=(string 'on')`| (changed, warning)| `"on"` |
| `writing-mode=(string 'off')`| (changed, warning)| `"off"` |
| `writing-mode=(symbol)`| (initial, warning)| `<null>` |
| `writing-mode=(function)`| (initial, warning)| `<null>` |
| `writing-mode=(null)`| (initial, warning)| `<null>` |
| `writing-mode=(undefined)`| (initial, warning)| `<null>` |

## `writingMode` (on `<text>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `writingMode=(string)`| (changed)| `"a string"` |
| `writingMode=(empty string)`| (changed)| `<empty string>` |
| `writingMode=(array with string)`| (changed)| `"string"` |
| `writingMode=(empty array)`| (changed)| `<empty string>` |
| `writingMode=(object)`| (changed)| `"result of toString()"` |
| `writingMode=(numeric string)`| (changed)| `"42"` |
| `writingMode=(-1)`| (changed)| `"-1"` |
| `writingMode=(0)`| (changed)| `"0"` |
| `writingMode=(integer)`| (changed)| `"1"` |
| `writingMode=(NaN)`| (changed, warning)| `"NaN"` |
| `writingMode=(float)`| (changed)| `"99.99"` |
| `writingMode=(true)`| (initial, warning)| `<null>` |
| `writingMode=(false)`| (initial, warning)| `<null>` |
| `writingMode=(string 'true')`| (changed)| `"true"` |
| `writingMode=(string 'false')`| (changed)| `"false"` |
| `writingMode=(string 'on')`| (changed)| `"on"` |
| `writingMode=(string 'off')`| (changed)| `"off"` |
| `writingMode=(symbol)`| (initial, warning)| `<null>` |
| `writingMode=(function)`| (initial, warning)| `<null>` |
| `writingMode=(null)`| (initial)| `<null>` |
| `writingMode=(undefined)`| (initial)| `<null>` |

## `x` (on `<altGlyph>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `x=(string)`| (changed)| `"a string"` |
| `x=(empty string)`| (changed)| `<empty string>` |
| `x=(array with string)`| (changed)| `"string"` |
| `x=(empty array)`| (changed)| `<empty string>` |
| `x=(object)`| (changed)| `"result of toString()"` |
| `x=(numeric string)`| (changed)| `"42"` |
| `x=(-1)`| (changed)| `"-1"` |
| `x=(0)`| (changed)| `"0"` |
| `x=(integer)`| (changed)| `"1"` |
| `x=(NaN)`| (changed, warning)| `"NaN"` |
| `x=(float)`| (changed)| `"99.99"` |
| `x=(true)`| (initial, warning)| `<null>` |
| `x=(false)`| (initial, warning)| `<null>` |
| `x=(string 'true')`| (changed)| `"true"` |
| `x=(string 'false')`| (changed)| `"false"` |
| `x=(string 'on')`| (changed)| `"on"` |
| `x=(string 'off')`| (changed)| `"off"` |
| `x=(symbol)`| (initial, warning)| `<null>` |
| `x=(function)`| (initial, warning)| `<null>` |
| `x=(null)`| (initial)| `<null>` |
| `x=(undefined)`| (initial)| `<null>` |

## `x-height` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `x-height=(string)`| (changed, warning)| `"a string"` |
| `x-height=(empty string)`| (changed, warning)| `<empty string>` |
| `x-height=(array with string)`| (changed, warning)| `"string"` |
| `x-height=(empty array)`| (changed, warning)| `<empty string>` |
| `x-height=(object)`| (changed, warning)| `"result of toString()"` |
| `x-height=(numeric string)`| (changed, warning)| `"42"` |
| `x-height=(-1)`| (changed, warning)| `"-1"` |
| `x-height=(0)`| (changed, warning)| `"0"` |
| `x-height=(integer)`| (changed, warning)| `"1"` |
| `x-height=(NaN)`| (changed, warning)| `"NaN"` |
| `x-height=(float)`| (changed, warning)| `"99.99"` |
| `x-height=(true)`| (initial, warning)| `<null>` |
| `x-height=(false)`| (initial, warning)| `<null>` |
| `x-height=(string 'true')`| (changed, warning)| `"true"` |
| `x-height=(string 'false')`| (changed, warning)| `"false"` |
| `x-height=(string 'on')`| (changed, warning)| `"on"` |
| `x-height=(string 'off')`| (changed, warning)| `"off"` |
| `x-height=(symbol)`| (initial, warning)| `<null>` |
| `x-height=(function)`| (initial, warning)| `<null>` |
| `x-height=(null)`| (initial, warning)| `<null>` |
| `x-height=(undefined)`| (initial, warning)| `<null>` |

## `x1` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `x1=(string)`| (initial)| `<SVGLength: 0>` |
| `x1=(empty string)`| (initial)| `<SVGLength: 0>` |
| `x1=(array with string)`| (initial)| `<SVGLength: 0>` |
| `x1=(empty array)`| (initial)| `<SVGLength: 0>` |
| `x1=(object)`| (initial)| `<SVGLength: 0>` |
| `x1=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `x1=(-1)`| (changed)| `<SVGLength: -1>` |
| `x1=(0)`| (initial)| `<SVGLength: 0>` |
| `x1=(integer)`| (changed)| `<SVGLength: 1>` |
| `x1=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `x1=(float)`| (changed)| `<SVGLength: 99.99>` |
| `x1=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `x1=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `x1=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `x1=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `x1=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `x1=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `x1=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `x1=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `x1=(null)`| (initial)| `<SVGLength: 0>` |
| `x1=(undefined)`| (initial)| `<SVGLength: 0>` |

## `x2` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `x2=(string)`| (initial)| `<SVGLength: 0>` |
| `x2=(empty string)`| (initial)| `<SVGLength: 0>` |
| `x2=(array with string)`| (initial)| `<SVGLength: 0>` |
| `x2=(empty array)`| (initial)| `<SVGLength: 0>` |
| `x2=(object)`| (initial)| `<SVGLength: 0>` |
| `x2=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `x2=(-1)`| (changed)| `<SVGLength: -1>` |
| `x2=(0)`| (initial)| `<SVGLength: 0>` |
| `x2=(integer)`| (changed)| `<SVGLength: 1>` |
| `x2=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `x2=(float)`| (changed)| `<SVGLength: 99.99>` |
| `x2=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `x2=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `x2=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `x2=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `x2=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `x2=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `x2=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `x2=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `x2=(null)`| (initial)| `<SVGLength: 0>` |
| `x2=(undefined)`| (initial)| `<SVGLength: 0>` |

## `xChannelSelector` (on `<feDisplacementMap>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xChannelSelector=(string)`| (changed)| `<number: 1>` |
| `xChannelSelector=(empty string)`| (initial)| `<number: 4>` |
| `xChannelSelector=(array with string)`| (changed)| `<number: 1>` |
| `xChannelSelector=(empty array)`| (initial)| `<number: 4>` |
| `xChannelSelector=(object)`| (initial)| `<number: 4>` |
| `xChannelSelector=(numeric string)`| (initial)| `<number: 4>` |
| `xChannelSelector=(-1)`| (initial)| `<number: 4>` |
| `xChannelSelector=(0)`| (initial)| `<number: 4>` |
| `xChannelSelector=(integer)`| (initial)| `<number: 4>` |
| `xChannelSelector=(NaN)`| (initial, warning)| `<number: 4>` |
| `xChannelSelector=(float)`| (initial)| `<number: 4>` |
| `xChannelSelector=(true)`| (initial, warning)| `<number: 4>` |
| `xChannelSelector=(false)`| (initial, warning)| `<number: 4>` |
| `xChannelSelector=(string 'true')`| (initial)| `<number: 4>` |
| `xChannelSelector=(string 'false')`| (initial)| `<number: 4>` |
| `xChannelSelector=(string 'on')`| (initial)| `<number: 4>` |
| `xChannelSelector=(string 'off')`| (initial)| `<number: 4>` |
| `xChannelSelector=(symbol)`| (initial, warning)| `<number: 4>` |
| `xChannelSelector=(function)`| (initial, warning)| `<number: 4>` |
| `xChannelSelector=(null)`| (initial)| `<number: 4>` |
| `xChannelSelector=(undefined)`| (initial)| `<number: 4>` |

## `xHeight` (on `<font-face>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xHeight=(string)`| (changed)| `"a string"` |
| `xHeight=(empty string)`| (changed)| `<empty string>` |
| `xHeight=(array with string)`| (changed)| `"string"` |
| `xHeight=(empty array)`| (changed)| `<empty string>` |
| `xHeight=(object)`| (changed)| `"result of toString()"` |
| `xHeight=(numeric string)`| (changed)| `"42"` |
| `xHeight=(-1)`| (changed)| `"-1"` |
| `xHeight=(0)`| (changed)| `"0"` |
| `xHeight=(integer)`| (changed)| `"1"` |
| `xHeight=(NaN)`| (changed, warning)| `"NaN"` |
| `xHeight=(float)`| (changed)| `"99.99"` |
| `xHeight=(true)`| (initial, warning)| `<null>` |
| `xHeight=(false)`| (initial, warning)| `<null>` |
| `xHeight=(string 'true')`| (changed)| `"true"` |
| `xHeight=(string 'false')`| (changed)| `"false"` |
| `xHeight=(string 'on')`| (changed)| `"on"` |
| `xHeight=(string 'off')`| (changed)| `"off"` |
| `xHeight=(symbol)`| (initial, warning)| `<null>` |
| `xHeight=(function)`| (initial, warning)| `<null>` |
| `xHeight=(null)`| (initial)| `<null>` |
| `xHeight=(undefined)`| (initial)| `<null>` |

## `XLink:Actuate` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `XLink:Actuate=(string)`| (changed, warning)| `"a string"` |
| `XLink:Actuate=(empty string)`| (changed, warning)| `<empty string>` |
| `XLink:Actuate=(array with string)`| (changed, warning)| `"string"` |
| `XLink:Actuate=(empty array)`| (changed, warning)| `<empty string>` |
| `XLink:Actuate=(object)`| (changed, warning)| `"result of toString()"` |
| `XLink:Actuate=(numeric string)`| (changed, warning)| `"42"` |
| `XLink:Actuate=(-1)`| (changed, warning)| `"-1"` |
| `XLink:Actuate=(0)`| (changed, warning)| `"0"` |
| `XLink:Actuate=(integer)`| (changed, warning)| `"1"` |
| `XLink:Actuate=(NaN)`| (changed, warning)| `"NaN"` |
| `XLink:Actuate=(float)`| (changed, warning)| `"99.99"` |
| `XLink:Actuate=(true)`| (initial, warning)| `<null>` |
| `XLink:Actuate=(false)`| (initial, warning)| `<null>` |
| `XLink:Actuate=(string 'true')`| (changed, warning)| `"true"` |
| `XLink:Actuate=(string 'false')`| (changed, warning)| `"false"` |
| `XLink:Actuate=(string 'on')`| (changed, warning)| `"on"` |
| `XLink:Actuate=(string 'off')`| (changed, warning)| `"off"` |
| `XLink:Actuate=(symbol)`| (initial, warning)| `<null>` |
| `XLink:Actuate=(function)`| (initial, warning)| `<null>` |
| `XLink:Actuate=(null)`| (initial, warning)| `<null>` |
| `XLink:Actuate=(undefined)`| (initial, warning)| `<null>` |

## `xlink:actuate` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlink:actuate=(string)`| (changed, warning)| `"a string"` |
| `xlink:actuate=(empty string)`| (changed, warning)| `<empty string>` |
| `xlink:actuate=(array with string)`| (changed, warning)| `"string"` |
| `xlink:actuate=(empty array)`| (changed, warning)| `<empty string>` |
| `xlink:actuate=(object)`| (changed, warning)| `"result of toString()"` |
| `xlink:actuate=(numeric string)`| (changed, warning)| `"42"` |
| `xlink:actuate=(-1)`| (changed, warning)| `"-1"` |
| `xlink:actuate=(0)`| (changed, warning)| `"0"` |
| `xlink:actuate=(integer)`| (changed, warning)| `"1"` |
| `xlink:actuate=(NaN)`| (changed, warning)| `"NaN"` |
| `xlink:actuate=(float)`| (changed, warning)| `"99.99"` |
| `xlink:actuate=(true)`| (initial, warning)| `<null>` |
| `xlink:actuate=(false)`| (initial, warning)| `<null>` |
| `xlink:actuate=(string 'true')`| (changed, warning)| `"true"` |
| `xlink:actuate=(string 'false')`| (changed, warning)| `"false"` |
| `xlink:actuate=(string 'on')`| (changed, warning)| `"on"` |
| `xlink:actuate=(string 'off')`| (changed, warning)| `"off"` |
| `xlink:actuate=(symbol)`| (initial, warning)| `<null>` |
| `xlink:actuate=(function)`| (initial, warning)| `<null>` |
| `xlink:actuate=(null)`| (initial, warning)| `<null>` |
| `xlink:actuate=(undefined)`| (initial, warning)| `<null>` |

## `xlink:arcrole` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlink:arcrole=(string)`| (changed, warning)| `"a string"` |
| `xlink:arcrole=(empty string)`| (changed, warning)| `<empty string>` |
| `xlink:arcrole=(array with string)`| (changed, warning)| `"string"` |
| `xlink:arcrole=(empty array)`| (changed, warning)| `<empty string>` |
| `xlink:arcrole=(object)`| (changed, warning)| `"result of toString()"` |
| `xlink:arcrole=(numeric string)`| (changed, warning)| `"42"` |
| `xlink:arcrole=(-1)`| (changed, warning)| `"-1"` |
| `xlink:arcrole=(0)`| (changed, warning)| `"0"` |
| `xlink:arcrole=(integer)`| (changed, warning)| `"1"` |
| `xlink:arcrole=(NaN)`| (changed, warning)| `"NaN"` |
| `xlink:arcrole=(float)`| (changed, warning)| `"99.99"` |
| `xlink:arcrole=(true)`| (initial, warning)| `<null>` |
| `xlink:arcrole=(false)`| (initial, warning)| `<null>` |
| `xlink:arcrole=(string 'true')`| (changed, warning)| `"true"` |
| `xlink:arcrole=(string 'false')`| (changed, warning)| `"false"` |
| `xlink:arcrole=(string 'on')`| (changed, warning)| `"on"` |
| `xlink:arcrole=(string 'off')`| (changed, warning)| `"off"` |
| `xlink:arcrole=(symbol)`| (initial, warning)| `<null>` |
| `xlink:arcrole=(function)`| (initial, warning)| `<null>` |
| `xlink:arcrole=(null)`| (initial, warning)| `<null>` |
| `xlink:arcrole=(undefined)`| (initial, warning)| `<null>` |

## `xlink:href` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlink:href=(string)`| (changed, warning)| `"a string"` |
| `xlink:href=(empty string)`| (changed, warning)| `<empty string>` |
| `xlink:href=(array with string)`| (changed, warning)| `"string"` |
| `xlink:href=(empty array)`| (changed, warning)| `<empty string>` |
| `xlink:href=(object)`| (changed, warning)| `"result of toString()"` |
| `xlink:href=(numeric string)`| (changed, warning)| `"42"` |
| `xlink:href=(-1)`| (changed, warning)| `"-1"` |
| `xlink:href=(0)`| (changed, warning)| `"0"` |
| `xlink:href=(integer)`| (changed, warning)| `"1"` |
| `xlink:href=(NaN)`| (changed, warning)| `"NaN"` |
| `xlink:href=(float)`| (changed, warning)| `"99.99"` |
| `xlink:href=(true)`| (initial, warning)| `<null>` |
| `xlink:href=(false)`| (initial, warning)| `<null>` |
| `xlink:href=(string 'true')`| (changed, warning)| `"true"` |
| `xlink:href=(string 'false')`| (changed, warning)| `"false"` |
| `xlink:href=(string 'on')`| (changed, warning)| `"on"` |
| `xlink:href=(string 'off')`| (changed, warning)| `"off"` |
| `xlink:href=(symbol)`| (initial, warning)| `<null>` |
| `xlink:href=(function)`| (initial, warning)| `<null>` |
| `xlink:href=(null)`| (initial, warning)| `<null>` |
| `xlink:href=(undefined)`| (initial, warning)| `<null>` |

## `xlink:role` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlink:role=(string)`| (changed, warning)| `"a string"` |
| `xlink:role=(empty string)`| (changed, warning)| `<empty string>` |
| `xlink:role=(array with string)`| (changed, warning)| `"string"` |
| `xlink:role=(empty array)`| (changed, warning)| `<empty string>` |
| `xlink:role=(object)`| (changed, warning)| `"result of toString()"` |
| `xlink:role=(numeric string)`| (changed, warning)| `"42"` |
| `xlink:role=(-1)`| (changed, warning)| `"-1"` |
| `xlink:role=(0)`| (changed, warning)| `"0"` |
| `xlink:role=(integer)`| (changed, warning)| `"1"` |
| `xlink:role=(NaN)`| (changed, warning)| `"NaN"` |
| `xlink:role=(float)`| (changed, warning)| `"99.99"` |
| `xlink:role=(true)`| (initial, warning)| `<null>` |
| `xlink:role=(false)`| (initial, warning)| `<null>` |
| `xlink:role=(string 'true')`| (changed, warning)| `"true"` |
| `xlink:role=(string 'false')`| (changed, warning)| `"false"` |
| `xlink:role=(string 'on')`| (changed, warning)| `"on"` |
| `xlink:role=(string 'off')`| (changed, warning)| `"off"` |
| `xlink:role=(symbol)`| (initial, warning)| `<null>` |
| `xlink:role=(function)`| (initial, warning)| `<null>` |
| `xlink:role=(null)`| (initial, warning)| `<null>` |
| `xlink:role=(undefined)`| (initial, warning)| `<null>` |

## `xlink:show` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlink:show=(string)`| (changed, warning)| `"a string"` |
| `xlink:show=(empty string)`| (changed, warning)| `<empty string>` |
| `xlink:show=(array with string)`| (changed, warning)| `"string"` |
| `xlink:show=(empty array)`| (changed, warning)| `<empty string>` |
| `xlink:show=(object)`| (changed, warning)| `"result of toString()"` |
| `xlink:show=(numeric string)`| (changed, warning)| `"42"` |
| `xlink:show=(-1)`| (changed, warning)| `"-1"` |
| `xlink:show=(0)`| (changed, warning)| `"0"` |
| `xlink:show=(integer)`| (changed, warning)| `"1"` |
| `xlink:show=(NaN)`| (changed, warning)| `"NaN"` |
| `xlink:show=(float)`| (changed, warning)| `"99.99"` |
| `xlink:show=(true)`| (initial, warning)| `<null>` |
| `xlink:show=(false)`| (initial, warning)| `<null>` |
| `xlink:show=(string 'true')`| (changed, warning)| `"true"` |
| `xlink:show=(string 'false')`| (changed, warning)| `"false"` |
| `xlink:show=(string 'on')`| (changed, warning)| `"on"` |
| `xlink:show=(string 'off')`| (changed, warning)| `"off"` |
| `xlink:show=(symbol)`| (initial, warning)| `<null>` |
| `xlink:show=(function)`| (initial, warning)| `<null>` |
| `xlink:show=(null)`| (initial, warning)| `<null>` |
| `xlink:show=(undefined)`| (initial, warning)| `<null>` |

## `xlink:title` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlink:title=(string)`| (changed, warning)| `"a string"` |
| `xlink:title=(empty string)`| (changed, warning)| `<empty string>` |
| `xlink:title=(array with string)`| (changed, warning)| `"string"` |
| `xlink:title=(empty array)`| (changed, warning)| `<empty string>` |
| `xlink:title=(object)`| (changed, warning)| `"result of toString()"` |
| `xlink:title=(numeric string)`| (changed, warning)| `"42"` |
| `xlink:title=(-1)`| (changed, warning)| `"-1"` |
| `xlink:title=(0)`| (changed, warning)| `"0"` |
| `xlink:title=(integer)`| (changed, warning)| `"1"` |
| `xlink:title=(NaN)`| (changed, warning)| `"NaN"` |
| `xlink:title=(float)`| (changed, warning)| `"99.99"` |
| `xlink:title=(true)`| (initial, warning)| `<null>` |
| `xlink:title=(false)`| (initial, warning)| `<null>` |
| `xlink:title=(string 'true')`| (changed, warning)| `"true"` |
| `xlink:title=(string 'false')`| (changed, warning)| `"false"` |
| `xlink:title=(string 'on')`| (changed, warning)| `"on"` |
| `xlink:title=(string 'off')`| (changed, warning)| `"off"` |
| `xlink:title=(symbol)`| (initial, warning)| `<null>` |
| `xlink:title=(function)`| (initial, warning)| `<null>` |
| `xlink:title=(null)`| (initial, warning)| `<null>` |
| `xlink:title=(undefined)`| (initial, warning)| `<null>` |

## `xlink:type` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlink:type=(string)`| (changed, warning)| `"a string"` |
| `xlink:type=(empty string)`| (changed, warning)| `<empty string>` |
| `xlink:type=(array with string)`| (changed, warning)| `"string"` |
| `xlink:type=(empty array)`| (changed, warning)| `<empty string>` |
| `xlink:type=(object)`| (changed, warning)| `"result of toString()"` |
| `xlink:type=(numeric string)`| (changed, warning)| `"42"` |
| `xlink:type=(-1)`| (changed, warning)| `"-1"` |
| `xlink:type=(0)`| (changed, warning)| `"0"` |
| `xlink:type=(integer)`| (changed, warning)| `"1"` |
| `xlink:type=(NaN)`| (changed, warning)| `"NaN"` |
| `xlink:type=(float)`| (changed, warning)| `"99.99"` |
| `xlink:type=(true)`| (initial, warning)| `<null>` |
| `xlink:type=(false)`| (initial, warning)| `<null>` |
| `xlink:type=(string 'true')`| (changed, warning)| `"true"` |
| `xlink:type=(string 'false')`| (changed, warning)| `"false"` |
| `xlink:type=(string 'on')`| (changed, warning)| `"on"` |
| `xlink:type=(string 'off')`| (changed, warning)| `"off"` |
| `xlink:type=(symbol)`| (initial, warning)| `<null>` |
| `xlink:type=(function)`| (initial, warning)| `<null>` |
| `xlink:type=(null)`| (initial, warning)| `<null>` |
| `xlink:type=(undefined)`| (initial, warning)| `<null>` |

## `xlinkActuate` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlinkActuate=(string)`| (changed)| `"a string"` |
| `xlinkActuate=(empty string)`| (changed)| `<empty string>` |
| `xlinkActuate=(array with string)`| (changed)| `"string"` |
| `xlinkActuate=(empty array)`| (changed)| `<empty string>` |
| `xlinkActuate=(object)`| (changed)| `"result of toString()"` |
| `xlinkActuate=(numeric string)`| (changed)| `"42"` |
| `xlinkActuate=(-1)`| (changed)| `"-1"` |
| `xlinkActuate=(0)`| (changed)| `"0"` |
| `xlinkActuate=(integer)`| (changed)| `"1"` |
| `xlinkActuate=(NaN)`| (changed, warning)| `"NaN"` |
| `xlinkActuate=(float)`| (changed)| `"99.99"` |
| `xlinkActuate=(true)`| (initial, warning)| `<null>` |
| `xlinkActuate=(false)`| (initial, warning)| `<null>` |
| `xlinkActuate=(string 'true')`| (changed)| `"true"` |
| `xlinkActuate=(string 'false')`| (changed)| `"false"` |
| `xlinkActuate=(string 'on')`| (changed)| `"on"` |
| `xlinkActuate=(string 'off')`| (changed)| `"off"` |
| `xlinkActuate=(symbol)`| (initial, warning)| `<null>` |
| `xlinkActuate=(function)`| (initial, warning)| `<null>` |
| `xlinkActuate=(null)`| (initial)| `<null>` |
| `xlinkActuate=(undefined)`| (initial)| `<null>` |

## `XlinkActuate` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `XlinkActuate=(string)`| (initial, warning)| `<null>` |
| `XlinkActuate=(empty string)`| (initial, warning)| `<null>` |
| `XlinkActuate=(array with string)`| (initial, warning)| `<null>` |
| `XlinkActuate=(empty array)`| (initial, warning)| `<null>` |
| `XlinkActuate=(object)`| (initial, warning)| `<null>` |
| `XlinkActuate=(numeric string)`| (initial, warning)| `<null>` |
| `XlinkActuate=(-1)`| (initial, warning)| `<null>` |
| `XlinkActuate=(0)`| (initial, warning)| `<null>` |
| `XlinkActuate=(integer)`| (initial, warning)| `<null>` |
| `XlinkActuate=(NaN)`| (initial, warning)| `<null>` |
| `XlinkActuate=(float)`| (initial, warning)| `<null>` |
| `XlinkActuate=(true)`| (initial, warning)| `<null>` |
| `XlinkActuate=(false)`| (initial, warning)| `<null>` |
| `XlinkActuate=(string 'true')`| (initial, warning)| `<null>` |
| `XlinkActuate=(string 'false')`| (initial, warning)| `<null>` |
| `XlinkActuate=(string 'on')`| (initial, warning)| `<null>` |
| `XlinkActuate=(string 'off')`| (initial, warning)| `<null>` |
| `XlinkActuate=(symbol)`| (initial, warning)| `<null>` |
| `XlinkActuate=(function)`| (initial, warning)| `<null>` |
| `XlinkActuate=(null)`| (initial, warning)| `<null>` |
| `XlinkActuate=(undefined)`| (initial, warning)| `<null>` |

## `xlinkArcrole` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlinkArcrole=(string)`| (changed)| `"a string"` |
| `xlinkArcrole=(empty string)`| (changed)| `<empty string>` |
| `xlinkArcrole=(array with string)`| (changed)| `"string"` |
| `xlinkArcrole=(empty array)`| (changed)| `<empty string>` |
| `xlinkArcrole=(object)`| (changed)| `"result of toString()"` |
| `xlinkArcrole=(numeric string)`| (changed)| `"42"` |
| `xlinkArcrole=(-1)`| (changed)| `"-1"` |
| `xlinkArcrole=(0)`| (changed)| `"0"` |
| `xlinkArcrole=(integer)`| (changed)| `"1"` |
| `xlinkArcrole=(NaN)`| (changed, warning)| `"NaN"` |
| `xlinkArcrole=(float)`| (changed)| `"99.99"` |
| `xlinkArcrole=(true)`| (initial, warning)| `<null>` |
| `xlinkArcrole=(false)`| (initial, warning)| `<null>` |
| `xlinkArcrole=(string 'true')`| (changed)| `"true"` |
| `xlinkArcrole=(string 'false')`| (changed)| `"false"` |
| `xlinkArcrole=(string 'on')`| (changed)| `"on"` |
| `xlinkArcrole=(string 'off')`| (changed)| `"off"` |
| `xlinkArcrole=(symbol)`| (initial, warning)| `<null>` |
| `xlinkArcrole=(function)`| (initial, warning)| `<null>` |
| `xlinkArcrole=(null)`| (initial)| `<null>` |
| `xlinkArcrole=(undefined)`| (initial)| `<null>` |

## `xlinkHref` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlinkHref=(string)`| (changed)| `"a string"` |
| `xlinkHref=(empty string)`| (changed)| `<empty string>` |
| `xlinkHref=(array with string)`| (changed)| `"string"` |
| `xlinkHref=(empty array)`| (changed)| `<empty string>` |
| `xlinkHref=(object)`| (changed)| `"result of toString()"` |
| `xlinkHref=(numeric string)`| (changed)| `"42"` |
| `xlinkHref=(-1)`| (changed)| `"-1"` |
| `xlinkHref=(0)`| (changed)| `"0"` |
| `xlinkHref=(integer)`| (changed)| `"1"` |
| `xlinkHref=(NaN)`| (changed, warning)| `"NaN"` |
| `xlinkHref=(float)`| (changed)| `"99.99"` |
| `xlinkHref=(true)`| (initial, warning)| `<null>` |
| `xlinkHref=(false)`| (initial, warning)| `<null>` |
| `xlinkHref=(string 'true')`| (changed)| `"true"` |
| `xlinkHref=(string 'false')`| (changed)| `"false"` |
| `xlinkHref=(string 'on')`| (changed)| `"on"` |
| `xlinkHref=(string 'off')`| (changed)| `"off"` |
| `xlinkHref=(symbol)`| (initial, warning)| `<null>` |
| `xlinkHref=(function)`| (initial, warning)| `<null>` |
| `xlinkHref=(null)`| (initial)| `<null>` |
| `xlinkHref=(undefined)`| (initial)| `<null>` |

## `xlinkRole` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlinkRole=(string)`| (changed)| `"a string"` |
| `xlinkRole=(empty string)`| (changed)| `<empty string>` |
| `xlinkRole=(array with string)`| (changed)| `"string"` |
| `xlinkRole=(empty array)`| (changed)| `<empty string>` |
| `xlinkRole=(object)`| (changed)| `"result of toString()"` |
| `xlinkRole=(numeric string)`| (changed)| `"42"` |
| `xlinkRole=(-1)`| (changed)| `"-1"` |
| `xlinkRole=(0)`| (changed)| `"0"` |
| `xlinkRole=(integer)`| (changed)| `"1"` |
| `xlinkRole=(NaN)`| (changed, warning)| `"NaN"` |
| `xlinkRole=(float)`| (changed)| `"99.99"` |
| `xlinkRole=(true)`| (initial, warning)| `<null>` |
| `xlinkRole=(false)`| (initial, warning)| `<null>` |
| `xlinkRole=(string 'true')`| (changed)| `"true"` |
| `xlinkRole=(string 'false')`| (changed)| `"false"` |
| `xlinkRole=(string 'on')`| (changed)| `"on"` |
| `xlinkRole=(string 'off')`| (changed)| `"off"` |
| `xlinkRole=(symbol)`| (initial, warning)| `<null>` |
| `xlinkRole=(function)`| (initial, warning)| `<null>` |
| `xlinkRole=(null)`| (initial)| `<null>` |
| `xlinkRole=(undefined)`| (initial)| `<null>` |

## `xlinkShow` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlinkShow=(string)`| (changed)| `"a string"` |
| `xlinkShow=(empty string)`| (changed)| `<empty string>` |
| `xlinkShow=(array with string)`| (changed)| `"string"` |
| `xlinkShow=(empty array)`| (changed)| `<empty string>` |
| `xlinkShow=(object)`| (changed)| `"result of toString()"` |
| `xlinkShow=(numeric string)`| (changed)| `"42"` |
| `xlinkShow=(-1)`| (changed)| `"-1"` |
| `xlinkShow=(0)`| (changed)| `"0"` |
| `xlinkShow=(integer)`| (changed)| `"1"` |
| `xlinkShow=(NaN)`| (changed, warning)| `"NaN"` |
| `xlinkShow=(float)`| (changed)| `"99.99"` |
| `xlinkShow=(true)`| (initial, warning)| `<null>` |
| `xlinkShow=(false)`| (initial, warning)| `<null>` |
| `xlinkShow=(string 'true')`| (changed)| `"true"` |
| `xlinkShow=(string 'false')`| (changed)| `"false"` |
| `xlinkShow=(string 'on')`| (changed)| `"on"` |
| `xlinkShow=(string 'off')`| (changed)| `"off"` |
| `xlinkShow=(symbol)`| (initial, warning)| `<null>` |
| `xlinkShow=(function)`| (initial, warning)| `<null>` |
| `xlinkShow=(null)`| (initial)| `<null>` |
| `xlinkShow=(undefined)`| (initial)| `<null>` |

## `xlinkTitle` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlinkTitle=(string)`| (changed)| `"a string"` |
| `xlinkTitle=(empty string)`| (changed)| `<empty string>` |
| `xlinkTitle=(array with string)`| (changed)| `"string"` |
| `xlinkTitle=(empty array)`| (changed)| `<empty string>` |
| `xlinkTitle=(object)`| (changed)| `"result of toString()"` |
| `xlinkTitle=(numeric string)`| (changed)| `"42"` |
| `xlinkTitle=(-1)`| (changed)| `"-1"` |
| `xlinkTitle=(0)`| (changed)| `"0"` |
| `xlinkTitle=(integer)`| (changed)| `"1"` |
| `xlinkTitle=(NaN)`| (changed, warning)| `"NaN"` |
| `xlinkTitle=(float)`| (changed)| `"99.99"` |
| `xlinkTitle=(true)`| (initial, warning)| `<null>` |
| `xlinkTitle=(false)`| (initial, warning)| `<null>` |
| `xlinkTitle=(string 'true')`| (changed)| `"true"` |
| `xlinkTitle=(string 'false')`| (changed)| `"false"` |
| `xlinkTitle=(string 'on')`| (changed)| `"on"` |
| `xlinkTitle=(string 'off')`| (changed)| `"off"` |
| `xlinkTitle=(symbol)`| (initial, warning)| `<null>` |
| `xlinkTitle=(function)`| (initial, warning)| `<null>` |
| `xlinkTitle=(null)`| (initial)| `<null>` |
| `xlinkTitle=(undefined)`| (initial)| `<null>` |

## `xlinkType` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xlinkType=(string)`| (changed)| `"a string"` |
| `xlinkType=(empty string)`| (changed)| `<empty string>` |
| `xlinkType=(array with string)`| (changed)| `"string"` |
| `xlinkType=(empty array)`| (changed)| `<empty string>` |
| `xlinkType=(object)`| (changed)| `"result of toString()"` |
| `xlinkType=(numeric string)`| (changed)| `"42"` |
| `xlinkType=(-1)`| (changed)| `"-1"` |
| `xlinkType=(0)`| (changed)| `"0"` |
| `xlinkType=(integer)`| (changed)| `"1"` |
| `xlinkType=(NaN)`| (changed, warning)| `"NaN"` |
| `xlinkType=(float)`| (changed)| `"99.99"` |
| `xlinkType=(true)`| (initial, warning)| `<null>` |
| `xlinkType=(false)`| (initial, warning)| `<null>` |
| `xlinkType=(string 'true')`| (changed)| `"true"` |
| `xlinkType=(string 'false')`| (changed)| `"false"` |
| `xlinkType=(string 'on')`| (changed)| `"on"` |
| `xlinkType=(string 'off')`| (changed)| `"off"` |
| `xlinkType=(symbol)`| (initial, warning)| `<null>` |
| `xlinkType=(function)`| (initial, warning)| `<null>` |
| `xlinkType=(null)`| (initial)| `<null>` |
| `xlinkType=(undefined)`| (initial)| `<null>` |

## `xml:base` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xml:base=(string)`| (changed, warning)| `"a string"` |
| `xml:base=(empty string)`| (changed, warning)| `<empty string>` |
| `xml:base=(array with string)`| (changed, warning)| `"string"` |
| `xml:base=(empty array)`| (changed, warning)| `<empty string>` |
| `xml:base=(object)`| (changed, warning)| `"result of toString()"` |
| `xml:base=(numeric string)`| (changed, warning)| `"42"` |
| `xml:base=(-1)`| (changed, warning)| `"-1"` |
| `xml:base=(0)`| (changed, warning)| `"0"` |
| `xml:base=(integer)`| (changed, warning)| `"1"` |
| `xml:base=(NaN)`| (changed, warning)| `"NaN"` |
| `xml:base=(float)`| (changed, warning)| `"99.99"` |
| `xml:base=(true)`| (initial, warning)| `<null>` |
| `xml:base=(false)`| (initial, warning)| `<null>` |
| `xml:base=(string 'true')`| (changed, warning)| `"true"` |
| `xml:base=(string 'false')`| (changed, warning)| `"false"` |
| `xml:base=(string 'on')`| (changed, warning)| `"on"` |
| `xml:base=(string 'off')`| (changed, warning)| `"off"` |
| `xml:base=(symbol)`| (initial, warning)| `<null>` |
| `xml:base=(function)`| (initial, warning)| `<null>` |
| `xml:base=(null)`| (initial, warning)| `<null>` |
| `xml:base=(undefined)`| (initial, warning)| `<null>` |

## `xml:lang` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xml:lang=(string)`| (changed, warning)| `"a string"` |
| `xml:lang=(empty string)`| (changed, warning)| `<empty string>` |
| `xml:lang=(array with string)`| (changed, warning)| `"string"` |
| `xml:lang=(empty array)`| (changed, warning)| `<empty string>` |
| `xml:lang=(object)`| (changed, warning)| `"result of toString()"` |
| `xml:lang=(numeric string)`| (changed, warning)| `"42"` |
| `xml:lang=(-1)`| (changed, warning)| `"-1"` |
| `xml:lang=(0)`| (changed, warning)| `"0"` |
| `xml:lang=(integer)`| (changed, warning)| `"1"` |
| `xml:lang=(NaN)`| (changed, warning)| `"NaN"` |
| `xml:lang=(float)`| (changed, warning)| `"99.99"` |
| `xml:lang=(true)`| (initial, warning)| `<null>` |
| `xml:lang=(false)`| (initial, warning)| `<null>` |
| `xml:lang=(string 'true')`| (changed, warning)| `"true"` |
| `xml:lang=(string 'false')`| (changed, warning)| `"false"` |
| `xml:lang=(string 'on')`| (changed, warning)| `"on"` |
| `xml:lang=(string 'off')`| (changed, warning)| `"off"` |
| `xml:lang=(symbol)`| (initial, warning)| `<null>` |
| `xml:lang=(function)`| (initial, warning)| `<null>` |
| `xml:lang=(null)`| (initial, warning)| `<null>` |
| `xml:lang=(undefined)`| (initial, warning)| `<null>` |

## `xml:space` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xml:space=(string)`| (changed, warning)| `"a string"` |
| `xml:space=(empty string)`| (changed, warning)| `<empty string>` |
| `xml:space=(array with string)`| (changed, warning)| `"string"` |
| `xml:space=(empty array)`| (changed, warning)| `<empty string>` |
| `xml:space=(object)`| (changed, warning)| `"result of toString()"` |
| `xml:space=(numeric string)`| (changed, warning)| `"42"` |
| `xml:space=(-1)`| (changed, warning)| `"-1"` |
| `xml:space=(0)`| (changed, warning)| `"0"` |
| `xml:space=(integer)`| (changed, warning)| `"1"` |
| `xml:space=(NaN)`| (changed, warning)| `"NaN"` |
| `xml:space=(float)`| (changed, warning)| `"99.99"` |
| `xml:space=(true)`| (initial, warning)| `<null>` |
| `xml:space=(false)`| (initial, warning)| `<null>` |
| `xml:space=(string 'true')`| (changed, warning)| `"true"` |
| `xml:space=(string 'false')`| (changed, warning)| `"false"` |
| `xml:space=(string 'on')`| (changed, warning)| `"on"` |
| `xml:space=(string 'off')`| (changed, warning)| `"off"` |
| `xml:space=(symbol)`| (initial, warning)| `<null>` |
| `xml:space=(function)`| (initial, warning)| `<null>` |
| `xml:space=(null)`| (initial, warning)| `<null>` |
| `xml:space=(undefined)`| (initial, warning)| `<null>` |

## `xmlBase` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xmlBase=(string)`| (changed)| `"a string"` |
| `xmlBase=(empty string)`| (changed)| `<empty string>` |
| `xmlBase=(array with string)`| (changed)| `"string"` |
| `xmlBase=(empty array)`| (changed)| `<empty string>` |
| `xmlBase=(object)`| (changed)| `"result of toString()"` |
| `xmlBase=(numeric string)`| (changed)| `"42"` |
| `xmlBase=(-1)`| (changed)| `"-1"` |
| `xmlBase=(0)`| (changed)| `"0"` |
| `xmlBase=(integer)`| (changed)| `"1"` |
| `xmlBase=(NaN)`| (changed, warning)| `"NaN"` |
| `xmlBase=(float)`| (changed)| `"99.99"` |
| `xmlBase=(true)`| (initial, warning)| `<null>` |
| `xmlBase=(false)`| (initial, warning)| `<null>` |
| `xmlBase=(string 'true')`| (changed)| `"true"` |
| `xmlBase=(string 'false')`| (changed)| `"false"` |
| `xmlBase=(string 'on')`| (changed)| `"on"` |
| `xmlBase=(string 'off')`| (changed)| `"off"` |
| `xmlBase=(symbol)`| (initial, warning)| `<null>` |
| `xmlBase=(function)`| (initial, warning)| `<null>` |
| `xmlBase=(null)`| (initial)| `<null>` |
| `xmlBase=(undefined)`| (initial)| `<null>` |

## `xmlLang` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xmlLang=(string)`| (changed)| `"a string"` |
| `xmlLang=(empty string)`| (changed)| `<empty string>` |
| `xmlLang=(array with string)`| (changed)| `"string"` |
| `xmlLang=(empty array)`| (changed)| `<empty string>` |
| `xmlLang=(object)`| (changed)| `"result of toString()"` |
| `xmlLang=(numeric string)`| (changed)| `"42"` |
| `xmlLang=(-1)`| (changed)| `"-1"` |
| `xmlLang=(0)`| (changed)| `"0"` |
| `xmlLang=(integer)`| (changed)| `"1"` |
| `xmlLang=(NaN)`| (changed, warning)| `"NaN"` |
| `xmlLang=(float)`| (changed)| `"99.99"` |
| `xmlLang=(true)`| (initial, warning)| `<null>` |
| `xmlLang=(false)`| (initial, warning)| `<null>` |
| `xmlLang=(string 'true')`| (changed)| `"true"` |
| `xmlLang=(string 'false')`| (changed)| `"false"` |
| `xmlLang=(string 'on')`| (changed)| `"on"` |
| `xmlLang=(string 'off')`| (changed)| `"off"` |
| `xmlLang=(symbol)`| (initial, warning)| `<null>` |
| `xmlLang=(function)`| (initial, warning)| `<null>` |
| `xmlLang=(null)`| (initial)| `<null>` |
| `xmlLang=(undefined)`| (initial)| `<null>` |

## `xmlns` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xmlns=(string)`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(empty string)`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(array with string)`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(empty array)`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(object)`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(numeric string)`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(-1)`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(0)`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(integer)`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(NaN)`| (initial, warning)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(float)`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(true)`| (initial, warning)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(false)`| (initial, warning)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(string 'true')`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(string 'false')`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(string 'on')`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(string 'off')`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(symbol)`| (initial, warning)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(function)`| (initial, warning)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(null)`| (initial)| `"http://www.w3.org/2000/svg"` |
| `xmlns=(undefined)`| (initial)| `"http://www.w3.org/2000/svg"` |

## `xmlns:xlink` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xmlns:xlink=(string)`| (changed, warning)| `"a string"` |
| `xmlns:xlink=(empty string)`| (changed, warning)| `<empty string>` |
| `xmlns:xlink=(array with string)`| (changed, warning)| `"string"` |
| `xmlns:xlink=(empty array)`| (changed, warning)| `<empty string>` |
| `xmlns:xlink=(object)`| (changed, warning)| `"result of toString()"` |
| `xmlns:xlink=(numeric string)`| (changed, warning)| `"42"` |
| `xmlns:xlink=(-1)`| (changed, warning)| `"-1"` |
| `xmlns:xlink=(0)`| (changed, warning)| `"0"` |
| `xmlns:xlink=(integer)`| (changed, warning)| `"1"` |
| `xmlns:xlink=(NaN)`| (changed, warning)| `"NaN"` |
| `xmlns:xlink=(float)`| (changed, warning)| `"99.99"` |
| `xmlns:xlink=(true)`| (initial, warning)| `<null>` |
| `xmlns:xlink=(false)`| (initial, warning)| `<null>` |
| `xmlns:xlink=(string 'true')`| (changed, warning)| `"true"` |
| `xmlns:xlink=(string 'false')`| (changed, warning)| `"false"` |
| `xmlns:xlink=(string 'on')`| (changed, warning)| `"on"` |
| `xmlns:xlink=(string 'off')`| (changed, warning)| `"off"` |
| `xmlns:xlink=(symbol)`| (initial, warning)| `<null>` |
| `xmlns:xlink=(function)`| (initial, warning)| `<null>` |
| `xmlns:xlink=(null)`| (initial, warning)| `<null>` |
| `xmlns:xlink=(undefined)`| (initial, warning)| `<null>` |

## `xmlnsXlink` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xmlnsXlink=(string)`| (changed)| `"a string"` |
| `xmlnsXlink=(empty string)`| (changed)| `<empty string>` |
| `xmlnsXlink=(array with string)`| (changed)| `"string"` |
| `xmlnsXlink=(empty array)`| (changed)| `<empty string>` |
| `xmlnsXlink=(object)`| (changed)| `"result of toString()"` |
| `xmlnsXlink=(numeric string)`| (changed)| `"42"` |
| `xmlnsXlink=(-1)`| (changed)| `"-1"` |
| `xmlnsXlink=(0)`| (changed)| `"0"` |
| `xmlnsXlink=(integer)`| (changed)| `"1"` |
| `xmlnsXlink=(NaN)`| (changed, warning)| `"NaN"` |
| `xmlnsXlink=(float)`| (changed)| `"99.99"` |
| `xmlnsXlink=(true)`| (initial, warning)| `<null>` |
| `xmlnsXlink=(false)`| (initial, warning)| `<null>` |
| `xmlnsXlink=(string 'true')`| (changed)| `"true"` |
| `xmlnsXlink=(string 'false')`| (changed)| `"false"` |
| `xmlnsXlink=(string 'on')`| (changed)| `"on"` |
| `xmlnsXlink=(string 'off')`| (changed)| `"off"` |
| `xmlnsXlink=(symbol)`| (initial, warning)| `<null>` |
| `xmlnsXlink=(function)`| (initial, warning)| `<null>` |
| `xmlnsXlink=(null)`| (initial)| `<null>` |
| `xmlnsXlink=(undefined)`| (initial)| `<null>` |

## `xmlSpace` (on `<div>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `xmlSpace=(string)`| (changed)| `"a string"` |
| `xmlSpace=(empty string)`| (changed)| `<empty string>` |
| `xmlSpace=(array with string)`| (changed)| `"string"` |
| `xmlSpace=(empty array)`| (changed)| `<empty string>` |
| `xmlSpace=(object)`| (changed)| `"result of toString()"` |
| `xmlSpace=(numeric string)`| (changed)| `"42"` |
| `xmlSpace=(-1)`| (changed)| `"-1"` |
| `xmlSpace=(0)`| (changed)| `"0"` |
| `xmlSpace=(integer)`| (changed)| `"1"` |
| `xmlSpace=(NaN)`| (changed, warning)| `"NaN"` |
| `xmlSpace=(float)`| (changed)| `"99.99"` |
| `xmlSpace=(true)`| (initial, warning)| `<null>` |
| `xmlSpace=(false)`| (initial, warning)| `<null>` |
| `xmlSpace=(string 'true')`| (changed)| `"true"` |
| `xmlSpace=(string 'false')`| (changed)| `"false"` |
| `xmlSpace=(string 'on')`| (changed)| `"on"` |
| `xmlSpace=(string 'off')`| (changed)| `"off"` |
| `xmlSpace=(symbol)`| (initial, warning)| `<null>` |
| `xmlSpace=(function)`| (initial, warning)| `<null>` |
| `xmlSpace=(null)`| (initial)| `<null>` |
| `xmlSpace=(undefined)`| (initial)| `<null>` |

## `y` (on `<altGlyph>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `y=(string)`| (changed)| `"a string"` |
| `y=(empty string)`| (changed)| `<empty string>` |
| `y=(array with string)`| (changed)| `"string"` |
| `y=(empty array)`| (changed)| `<empty string>` |
| `y=(object)`| (changed)| `"result of toString()"` |
| `y=(numeric string)`| (changed)| `"42"` |
| `y=(-1)`| (changed)| `"-1"` |
| `y=(0)`| (changed)| `"0"` |
| `y=(integer)`| (changed)| `"1"` |
| `y=(NaN)`| (changed, warning)| `"NaN"` |
| `y=(float)`| (changed)| `"99.99"` |
| `y=(true)`| (initial, warning)| `<null>` |
| `y=(false)`| (initial, warning)| `<null>` |
| `y=(string 'true')`| (changed)| `"true"` |
| `y=(string 'false')`| (changed)| `"false"` |
| `y=(string 'on')`| (changed)| `"on"` |
| `y=(string 'off')`| (changed)| `"off"` |
| `y=(symbol)`| (initial, warning)| `<null>` |
| `y=(function)`| (initial, warning)| `<null>` |
| `y=(null)`| (initial)| `<null>` |
| `y=(undefined)`| (initial)| `<null>` |

## `y1` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `y1=(string)`| (initial)| `<SVGLength: 0>` |
| `y1=(empty string)`| (initial)| `<SVGLength: 0>` |
| `y1=(array with string)`| (initial)| `<SVGLength: 0>` |
| `y1=(empty array)`| (initial)| `<SVGLength: 0>` |
| `y1=(object)`| (initial)| `<SVGLength: 0>` |
| `y1=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `y1=(-1)`| (changed)| `<SVGLength: -1>` |
| `y1=(0)`| (initial)| `<SVGLength: 0>` |
| `y1=(integer)`| (changed)| `<SVGLength: 1>` |
| `y1=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `y1=(float)`| (changed)| `<SVGLength: 99.99>` |
| `y1=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `y1=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `y1=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `y1=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `y1=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `y1=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `y1=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `y1=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `y1=(null)`| (initial)| `<SVGLength: 0>` |
| `y1=(undefined)`| (initial)| `<SVGLength: 0>` |

## `y2` (on `<line>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `y2=(string)`| (initial)| `<SVGLength: 0>` |
| `y2=(empty string)`| (initial)| `<SVGLength: 0>` |
| `y2=(array with string)`| (initial)| `<SVGLength: 0>` |
| `y2=(empty array)`| (initial)| `<SVGLength: 0>` |
| `y2=(object)`| (initial)| `<SVGLength: 0>` |
| `y2=(numeric string)`| (changed)| `<SVGLength: 42>` |
| `y2=(-1)`| (changed)| `<SVGLength: -1>` |
| `y2=(0)`| (initial)| `<SVGLength: 0>` |
| `y2=(integer)`| (changed)| `<SVGLength: 1>` |
| `y2=(NaN)`| (initial, warning)| `<SVGLength: 0>` |
| `y2=(float)`| (changed)| `<SVGLength: 99.99>` |
| `y2=(true)`| (initial, warning)| `<SVGLength: 0>` |
| `y2=(false)`| (initial, warning)| `<SVGLength: 0>` |
| `y2=(string 'true')`| (initial)| `<SVGLength: 0>` |
| `y2=(string 'false')`| (initial)| `<SVGLength: 0>` |
| `y2=(string 'on')`| (initial)| `<SVGLength: 0>` |
| `y2=(string 'off')`| (initial)| `<SVGLength: 0>` |
| `y2=(symbol)`| (initial, warning)| `<SVGLength: 0>` |
| `y2=(function)`| (initial, warning)| `<SVGLength: 0>` |
| `y2=(null)`| (initial)| `<SVGLength: 0>` |
| `y2=(undefined)`| (initial)| `<SVGLength: 0>` |

## `yChannelSelector` (on `<feDisplacementMap>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `yChannelSelector=(string)`| (changed)| `<number: 3>` |
| `yChannelSelector=(empty string)`| (initial)| `<number: 4>` |
| `yChannelSelector=(array with string)`| (changed)| `<number: 3>` |
| `yChannelSelector=(empty array)`| (initial)| `<number: 4>` |
| `yChannelSelector=(object)`| (initial)| `<number: 4>` |
| `yChannelSelector=(numeric string)`| (initial)| `<number: 4>` |
| `yChannelSelector=(-1)`| (initial)| `<number: 4>` |
| `yChannelSelector=(0)`| (initial)| `<number: 4>` |
| `yChannelSelector=(integer)`| (initial)| `<number: 4>` |
| `yChannelSelector=(NaN)`| (initial, warning)| `<number: 4>` |
| `yChannelSelector=(float)`| (initial)| `<number: 4>` |
| `yChannelSelector=(true)`| (initial, warning)| `<number: 4>` |
| `yChannelSelector=(false)`| (initial, warning)| `<number: 4>` |
| `yChannelSelector=(string 'true')`| (initial)| `<number: 4>` |
| `yChannelSelector=(string 'false')`| (initial)| `<number: 4>` |
| `yChannelSelector=(string 'on')`| (initial)| `<number: 4>` |
| `yChannelSelector=(string 'off')`| (initial)| `<number: 4>` |
| `yChannelSelector=(symbol)`| (initial, warning)| `<number: 4>` |
| `yChannelSelector=(function)`| (initial, warning)| `<number: 4>` |
| `yChannelSelector=(null)`| (initial)| `<number: 4>` |
| `yChannelSelector=(undefined)`| (initial)| `<number: 4>` |

## `z` (on `<fePointLight>` inside `<svg>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `z=(string)`| (initial)| `<number: 0>` |
| `z=(empty string)`| (initial)| `<number: 0>` |
| `z=(array with string)`| (initial)| `<number: 0>` |
| `z=(empty array)`| (initial)| `<number: 0>` |
| `z=(object)`| (initial)| `<number: 0>` |
| `z=(numeric string)`| (changed)| `<number: 42>` |
| `z=(-1)`| (changed)| `<number: -1>` |
| `z=(0)`| (initial)| `<number: 0>` |
| `z=(integer)`| (changed)| `<number: 1>` |
| `z=(NaN)`| (initial, warning)| `<number: 0>` |
| `z=(float)`| (changed)| `<number: 99.98999786376953>` |
| `z=(true)`| (initial, warning)| `<number: 0>` |
| `z=(false)`| (initial, warning)| `<number: 0>` |
| `z=(string 'true')`| (initial)| `<number: 0>` |
| `z=(string 'false')`| (initial)| `<number: 0>` |
| `z=(string 'on')`| (initial)| `<number: 0>` |
| `z=(string 'off')`| (initial)| `<number: 0>` |
| `z=(symbol)`| (initial, warning)| `<number: 0>` |
| `z=(function)`| (initial, warning)| `<number: 0>` |
| `z=(null)`| (initial)| `<number: 0>` |
| `z=(undefined)`| (initial)| `<number: 0>` |

## `zoomAndPan` (on `<svg>` inside `<div>`)
| Test Case | Flags | Result |
| --- | --- | --- |
| `zoomAndPan=(string)`| (changed)| `<number: 0>` |
| `zoomAndPan=(empty string)`| (changed)| `<number: 0>` |
| `zoomAndPan=(array with string)`| (changed)| `<number: 0>` |
| `zoomAndPan=(empty array)`| (changed)| `<number: 0>` |
| `zoomAndPan=(object)`| (changed)| `<number: 0>` |
| `zoomAndPan=(numeric string)`| (changed)| `<number: 0>` |
| `zoomAndPan=(-1)`| (changed)| `<number: 0>` |
| `zoomAndPan=(0)`| (changed)| `<number: 0>` |
| `zoomAndPan=(integer)`| (changed)| `<number: 0>` |
| `zoomAndPan=(NaN)`| (changed, warning)| `<number: 0>` |
| `zoomAndPan=(float)`| (changed)| `<number: 0>` |
| `zoomAndPan=(true)`| (initial, warning)| `<number: 2>` |
| `zoomAndPan=(false)`| (initial, warning)| `<number: 2>` |
| `zoomAndPan=(string 'true')`| (changed)| `<number: 0>` |
| `zoomAndPan=(string 'false')`| (changed)| `<number: 0>` |
| `zoomAndPan=(string 'on')`| (changed)| `<number: 0>` |
| `zoomAndPan=(string 'off')`| (changed)| `<number: 0>` |
| `zoomAndPan=(symbol)`| (initial, warning)| `<number: 2>` |
| `zoomAndPan=(function)`| (initial, warning)| `<number: 2>` |
| `zoomAndPan=(null)`| (initial)| `<number: 2>` |
| `zoomAndPan=(undefined)`| (initial)| `<number: 2>` |

