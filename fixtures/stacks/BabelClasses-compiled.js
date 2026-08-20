function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError(
      "this hasn't been initialised - super() hasn't been called"
    );
  }
  return self;
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _toPropertyKey(t) {
  var i = _toPrimitive(t, 'string');
  return 'symbol' == typeof i ? i : i + '';
}
function _toPrimitive(t, r) {
  if ('object' != typeof t || !t) return t;
  var e = t[Symbol.toPrimitive];
  if (void 0 !== e) {
    var i = e.call(t, r || 'default');
    if ('object' != typeof i) return i;
    throw new TypeError('@@toPrimitive must return a primitive value.');
  }
  return ('string' === r ? String : Number)(t);
}
function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  _setPrototypeOf(subClass, superClass);
}
function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf
    ? Object.setPrototypeOf.bind()
    : function _setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
      };
  return _setPrototypeOf(o, p);
}
// Compile this with Babel.
// babel --config-file ./babel.config.json BabelClasses.js --out-file BabelClasses-compiled.js --source-maps

export let BabelClass = /*#__PURE__*/ (function (_React$Component) {
  _inheritsLoose(BabelClass, _React$Component);
  function BabelClass() {
    return _React$Component.apply(this, arguments) || this;
  }
  var _proto = BabelClass.prototype;
  _proto.render = function render() {
    return this.props.children;
  };
  return BabelClass;
})(React.Component);
export let BabelClassWithFields = /*#__PURE__*/ (function (_React$Component2) {
  _inheritsLoose(BabelClassWithFields, _React$Component2);
  function BabelClassWithFields(...args) {
    var _this;
    _this = _React$Component2.call(this, ...args) || this;
    _defineProperty(_assertThisInitialized(_this), 'props', void 0);
    _defineProperty(_assertThisInitialized(_this), 'state', {});
    return _this;
  } // These compile to defineProperty which can break some interception techniques.
  var _proto2 = BabelClassWithFields.prototype;
  _proto2.render = function render() {
    return this.props.children;
  };
  return BabelClassWithFields;
})(React.Component);

//# sourceMappingURL=BabelClasses-compiled.js.map
