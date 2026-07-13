###
Copyright (c) Meta Platforms, Inc. and affiliates.

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
###

PropTypes = null
React = null
ReactDOM = null
ReactDOMClient = null
assertConsoleErrorDev = null
assertConsoleWarnDev = null

featureFlags = require 'shared/ReactFeatureFlags'

describe 'ReactCoffeeScriptClass', ->
  container = null
  root = null
  InnerComponent = null
  attachedListener = null;
  renderedName = null;

  beforeEach ->
    React = require 'react'
    ReactDOM = require 'react-dom'
    ReactDOMClient = require 'react-dom/client'
    PropTypes = require 'prop-types'
    container = document.createElement 'div'
    root = ReactDOMClient.createRoot container
    attachedListener = null
    renderedName = null
    TestUtils = require 'internal-test-utils'
    assertConsoleErrorDev = TestUtils.assertConsoleErrorDev
    assertConsoleWarnDev = TestUtils.assertConsoleWarnDev
    InnerComponent = class extends React.Component
      getName: -> this.props.name
      render: ->
        attachedListener = this.props.onClick
        renderedName = this.props.name
        return React.createElement('div', className: this.props.name)

  test = (element, expectedTag, expectedClassName) ->
    ReactDOM.flushSync ->
      root.render(element)
    expect(container.firstChild).not.toBeNull()
    expect(container.firstChild.tagName).toBe(expectedTag)
    expect(container.firstChild.className).toBe(expectedClassName)

  it 'preserves the name of the class for use in error messages', ->
    class Foo extends React.Component
    expect(Foo.name).toBe 'Foo'

  it 'throws if no render function is defined', ->
    class Foo extends React.Component
    caughtErrors = []
    errorHandler = (event) ->
      event.preventDefault()
      caughtErrors.push(event.error)
    window.addEventListener 'error', errorHandler;
    ReactDOM.flushSync ->
      root.render React.createElement(Foo)
    assertConsoleErrorDev [
# A failed component renders twice in DEV in concurrent mode
      'No `render` method found on the Foo instance: you may have forgotten to define `render`.\n' +
        '     in Foo (at **)',
      'No `render` method found on the Foo instance: you may have forgotten to define `render`.\n' +
        '     in Foo (at **)',
    ]
    window.removeEventListener 'error', errorHandler;
    expect(caughtErrors).toEqual([
      expect.objectContaining(
        message: expect.stringContaining('is not a function')
      )
    ])

  it 'renders a simple stateless component with prop', ->
    class Foo extends React.Component
      render: ->
        React.createElement(InnerComponent,
          name: @props.bar
        )

    test React.createElement(Foo, bar: 'foo'), 'DIV', 'foo'
    test React.createElement(Foo, bar: 'bar'), 'DIV', 'bar'

  it 'renders based on state using initial values in this.props', ->
    class Foo extends React.Component
      constructor: (props) ->
        super props
        @state = bar: @props.initialValue

      render: ->
        React.createElement('span',
          className: @state.bar
        )

    test React.createElement(Foo, initialValue: 'foo'), 'SPAN', 'foo'

  it 'renders based on state using props in the constructor', ->
    class Foo extends React.Component
      constructor: (props) ->
        @state = bar: props.initialValue

      changeState: ->
        @setState bar: 'bar'

      render: ->
        if @state.bar is 'foo'
          return React.createElement('div',
            className: 'foo'
          )
        React.createElement('span',
          className: @state.bar
        )

    ref = React.createRef()
    test React.createElement(Foo, initialValue: 'foo', ref: ref), 'DIV', 'foo'
    ReactDOM.flushSync ->
      ref.current.changeState()
    test React.createElement(Foo), 'SPAN', 'bar'

  it 'sets initial state with value returned by static getDerivedStateFromProps', ->
    class Foo extends React.Component
      constructor: (props) ->
        super props
        @state = foo: null
      render: ->
        React.createElement('div',
          className: "#{@state.foo} #{@state.bar}"
        )
    Foo.getDerivedStateFromProps = (nextProps, prevState) ->
      {
        foo: nextProps.foo
        bar: 'bar'
      }
    test React.createElement(Foo, foo: 'foo'), 'DIV', 'foo bar'

  it 'warns if getDerivedStateFromProps is not static', ->
    class Foo extends React.Component
      render: ->
        React.createElement('div')
      getDerivedStateFromProps: ->
        {}
    ReactDOM.flushSync ->
     root.render React.createElement(Foo, foo: 'foo')
    assertConsoleErrorDev [
      'Foo: getDerivedStateFromProps() is defined as an instance method and will be ignored. Instead, declare it as a static method.\n' +
        '    in Foo (at **)']

  it 'warns if getDerivedStateFromError is not static', ->
    class Foo extends React.Component
      render: ->
        React.createElement('div')
      getDerivedStateFromError: ->
        {}
    ReactDOM.flushSync ->
      root.render React.createElement(Foo, foo: 'foo')

    assertConsoleErrorDev [
      'Foo: getDerivedStateFromError() is defined as an instance method and will be ignored. Instead, declare it as a static method.\n' +
        '    in Foo (at **)'
    ]

  it 'warns if getSnapshotBeforeUpdate is static', ->
    class Foo extends React.Component
      render: ->
        React.createElement('div')
    Foo.getSnapshotBeforeUpdate = () ->
      {}
    ReactDOM.flushSync ->
      root.render React.createElement(Foo, foo: 'foo')

    assertConsoleErrorDev [
      'Foo: getSnapshotBeforeUpdate() is defined as a static method and will be ignored. Instead, declare it as an instance method.\n' +
        '    in Foo (at **)'
    ]

  it 'warns if state not initialized before static getDerivedStateFromProps', ->
    class Foo extends React.Component
      render: ->
        React.createElement('div',
          className: "#{@state.foo} #{@state.bar}"
        )
    Foo.getDerivedStateFromProps = (nextProps, prevState) ->
      {
        foo: nextProps.foo
        bar: 'bar'
      }
    ReactDOM.flushSync ->
      root.render React.createElement(Foo, foo: 'foo')

    assertConsoleErrorDev [
      '`Foo` uses `getDerivedStateFromProps` but its initial state is
       undefined. This is not recommended. Instead, define the initial state by
       assigning an object to `this.state` in the constructor of `Foo`.
       This ensures that `getDerivedStateFromProps` arguments have a consistent shape.\n' +
        '     in Foo (at **)'
    ]

  it 'updates initial state with values returned by static getDerivedStateFromProps', ->
    class Foo extends React.Component
      constructor: (props, context) ->
        super props, context
        @state =
          foo: 'foo'
          bar: 'bar'
      render: ->
        React.createElement('div',
          className: "#{@state.foo} #{@state.bar}"
        )
    Foo.getDerivedStateFromProps = (nextProps, prevState) ->
      {
        foo: "not-#{prevState.foo}"
      }
    test React.createElement(Foo), 'DIV', 'not-foo bar'

  it 'renders updated state with values returned by static getDerivedStateFromProps', ->
    class Foo extends React.Component
      constructor: (props, context) ->
        super props, context
        @state =
          value: 'initial'
      render: ->
        React.createElement('div',
          className: @state.value
        )
    Foo.getDerivedStateFromProps = (nextProps, prevState) ->
      if nextProps.update
        return {
          value: 'updated'
        }
      return null
    test React.createElement(Foo, update: false), 'DIV', 'initial'
    test React.createElement(Foo, update: true), 'DIV', 'updated'

  if !featureFlags.disableLegacyContext
    it 'renders based on context in the constructor', ->
      class Foo extends React.Component
        @contextTypes:
          tag: PropTypes.string
          className: PropTypes.string

        constructor: (props, context) ->
          super props, context
          @state =
            tag: context.tag
            className: @context.className

        render: ->
          Tag = @state.tag
          React.createElement Tag,
            className: @state.className

      class Outer extends React.Component
        @childContextTypes:
          tag: PropTypes.string
          className: PropTypes.string

        getChildContext: ->
          tag: 'span'
          className: 'foo'

        render: ->
          React.createElement Foo

      test React.createElement(Outer), 'SPAN', 'foo'
      
      assertConsoleErrorDev([
        'Outer uses the legacy childContextTypes API which will soon be removed.
         Use React.createContext() instead. (https://react.dev/link/legacy-context)\n' +
          '    in Outer (at **)',
        'Foo uses the legacy contextTypes API which will soon be removed.
         Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)\n' +
          '    in Outer (at **)',
      ]);

  it 'renders only once when setting state in componentWillMount', ->
    renderCount = 0
    class Foo extends React.Component
      constructor: (props) ->
        @state = bar: props.initialValue

      UNSAFE_componentWillMount: ->
        @setState bar: 'bar'

      render: ->
        renderCount++
        React.createElement('span', className: @state.bar)

    test React.createElement(Foo, initialValue: 'foo'), 'SPAN', 'bar'
    expect(renderCount).toBe(1)

  it 'should warn with non-object in the initial state property', ->
    [['an array'], 'a string', 1234].forEach (state) ->
      class Foo extends React.Component
        constructor: ->
          @state = state

        render: ->
          React.createElement('span')

      test React.createElement(Foo), 'SPAN', ''
      assertConsoleErrorDev [
        'Foo.state: must be set to an object or null\n' +
          '    in Foo (at **)'
      ]

  it 'should render with null in the initial state property', ->
    class Foo extends React.Component
      constructor: ->
        @state = null

      render: ->
        React.createElement('span')

    test React.createElement(Foo), 'SPAN', ''

  it 'setState through an event handler', ->
    class Foo extends React.Component
      constructor: (props) ->
        @state = bar: props.initialValue

      handleClick: =>
        @setState bar: 'bar'

      render: ->
        React.createElement(InnerComponent,
          name: @state.bar
          onClick: @handleClick
        )

    test React.createElement(Foo, initialValue: 'foo'), 'DIV', 'foo'
    ReactDOM.flushSync ->
      attachedListener()
    expect(renderedName).toBe 'bar'

  it 'should not implicitly bind event handlers', ->
    class Foo extends React.Component
      constructor: (props) ->
        @state = bar: props.initialValue

      handleClick: -> # needs double arrow
        @setState bar: 'bar'

      render: ->
        React.createElement(InnerComponent,
          name: @state.bar
          onClick: @handleClick
        )

    test React.createElement(Foo, initialValue: 'foo'), 'DIV', 'foo'
    expect(attachedListener).toThrow()

  it 'renders using forceUpdate even when there is no state', ->
    class Foo extends React.Component
      constructor: (props) ->
        @mutativeValue = props.initialValue

      handleClick: =>
        @mutativeValue = 'bar'
        @forceUpdate()

      render: ->
        React.createElement(InnerComponent,
          name: @mutativeValue
          onClick: @handleClick
        )

    test React.createElement(Foo, initialValue: 'foo'), 'DIV', 'foo'
    ReactDOM.flushSync ->
      attachedListener()
    expect(renderedName).toBe 'bar'

  it 'will call all the normal life cycle methods', ->
    lifeCycles = []
    class Foo extends React.Component
      constructor: ->
        @state = {}

      UNSAFE_componentWillMount: ->
        lifeCycles.push 'will-mount'

      componentDidMount: ->
        lifeCycles.push 'did-mount'

      UNSAFE_componentWillReceiveProps: (nextProps) ->
        lifeCycles.push 'receive-props', nextProps

      shouldComponentUpdate: (nextProps, nextState) ->
        lifeCycles.push 'should-update', nextProps, nextState
        true

      UNSAFE_componentWillUpdate: (nextProps, nextState) ->
        lifeCycles.push 'will-update', nextProps, nextState

      componentDidUpdate: (prevProps, prevState) ->
        lifeCycles.push 'did-update', prevProps, prevState

      componentWillUnmount: ->
        lifeCycles.push 'will-unmount'

      render: ->
        React.createElement('span',
          className: @props.value
        )

    test React.createElement(Foo, value: 'foo'), 'SPAN', 'foo'
    expect(lifeCycles).toEqual [
      'will-mount'
      'did-mount'
    ]
    lifeCycles = [] # reset
    test React.createElement(Foo, value: 'bar'), 'SPAN', 'bar'
    expect(lifeCycles).toEqual [
      'receive-props', { value: 'bar' }
      'should-update', { value: 'bar' }, {}
      'will-update',   { value: 'bar' }, {}
      'did-update',    { value: 'foo' }, {}
    ]
    lifeCycles = [] # reset
    ReactDOM.flushSync ->
      root.unmount()
    expect(lifeCycles).toEqual ['will-unmount']

  if !featureFlags.disableLegacyContext
    it 'warns when classic properties are defined on the instance,
        but does not invoke them.', ->
      getInitialStateWasCalled = false
      getDefaultPropsWasCalled = false
      class Foo extends React.Component
        constructor: ->
          @contextTypes = {}
          @contextType = {}

        getInitialState: ->
          getInitialStateWasCalled = true
          {}

        getDefaultProps: ->
          getDefaultPropsWasCalled = true
          {}

        render: ->
          React.createElement('span',
            className: 'foo'
          )

      test React.createElement(Foo), 'SPAN', 'foo'
      assertConsoleErrorDev [
        'getInitialState was defined on Foo, a plain JavaScript class.
         This is only supported for classes created using React.createClass.
         Did you mean to define a state property instead?\n' +
          '     in Foo (at **)',
        'getDefaultProps was defined on Foo, a plain JavaScript class.
         This is only supported for classes created using React.createClass.
         Use a static property to define defaultProps instead.\n' +
          '    in Foo (at **)',
        'contextType was defined as an instance property on Foo. Use a static property to define contextType instead.\n' +
          '    in Foo (at **)',
        'contextTypes was defined as an instance property on Foo. Use a static property to define contextTypes instead.\n' +
          '    in Foo (at **)',
      ]
      expect(getInitialStateWasCalled).toBe false
      expect(getDefaultPropsWasCalled).toBe false

  it 'does not warn about getInitialState() on class components
      if state is also defined.', ->
    class Foo extends React.Component
      constructor: (props) ->
        super props
        @state = bar: @props.initialValue

      getInitialState: ->
        {}

      render: ->
        React.createElement('span',
          className: 'foo'
        )

    test React.createElement(Foo), 'SPAN', 'foo'

  it 'should warn when misspelling shouldComponentUpdate', ->
    class NamedComponent extends React.Component
      componentShouldUpdate: ->
        false

      render: ->
        React.createElement('span',
          className: 'foo'
        )

    test React.createElement(NamedComponent), 'SPAN', 'foo'
    assertConsoleErrorDev [
      'NamedComponent has a method called componentShouldUpdate().
       Did you mean shouldComponentUpdate()? The name is phrased as a
       question because the function is expected to return a value.\n' +
        '    in NamedComponent (at **)'
    ]

  it 'should warn when misspelling componentWillReceiveProps', ->
    class NamedComponent extends React.Component
      componentWillRecieveProps: ->
        false

      render: ->
        React.createElement('span',
          className: 'foo'
        )

    test React.createElement(NamedComponent), 'SPAN', 'foo'
    assertConsoleErrorDev [
      'NamedComponent has a method called componentWillRecieveProps().
       Did you mean componentWillReceiveProps()?\n' +
        '    in NamedComponent (at **)'
    ]

  it 'should warn when misspelling UNSAFE_componentWillReceiveProps', ->
    class NamedComponent extends React.Component
      UNSAFE_componentWillRecieveProps: ->
        false

      render: ->
        React.createElement('span',
          className: 'foo'
        )

    test React.createElement(NamedComponent), 'SPAN', 'foo'
    assertConsoleErrorDev [
      'NamedComponent has a method called UNSAFE_componentWillRecieveProps().
       Did you mean UNSAFE_componentWillReceiveProps()?\n' +
        '    in NamedComponent (at **)'
    ]

  it 'should throw AND warn when trying to access classic APIs', ->
    ref = React.createRef()
    test React.createElement(InnerComponent, name: 'foo', ref: ref), 'DIV', 'foo'

    expect(-> ref.current.replaceState {}).toThrow()
    assertConsoleWarnDev([
      'replaceState(...) is deprecated in plain JavaScript React classes. Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236).'])

    expect(-> ref.current.isMounted()).toThrow()
    assertConsoleWarnDev([
      'isMounted(...) is deprecated in plain JavaScript React classes. Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks.'])

  if !featureFlags.disableLegacyContext
    it 'supports this.context passed via getChildContext', ->
      class Bar extends React.Component
        @contextTypes:
          bar: PropTypes.string
        render: ->
          React.createElement('div', className: @context.bar)

      class Foo extends React.Component
        @childContextTypes:
          bar: PropTypes.string
        getChildContext: ->
          bar: 'bar-through-context'
        render: ->
          React.createElement Bar

      test React.createElement(Foo), 'DIV', 'bar-through-context'
      assertConsoleErrorDev [
        'Foo uses the legacy childContextTypes API which will soon be removed. Use React.createContext() instead.
         (https://react.dev/link/legacy-context)\n' +
          '    in Foo (at **)',
        'Bar uses the legacy contextTypes API which will soon be removed. Use React.createContext() with static contextType instead.
         (https://react.dev/link/legacy-context)\n' +
          '    in Foo (at **)'
      ]

  undefined
