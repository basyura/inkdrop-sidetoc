"use strict";
"use babel";

var _eventKit = require("event-kit");

var SideTocPane = _interopRequireWildcard(require("./sidetoc-pane"));

var _dispatcher = _interopRequireDefault(require("./dispatcher"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const componentName = "SideTocPane";
const layoutName = "mde";

class SideTocPlugin {
  constructor() {
    _defineProperty(this, "subscriptions", new _eventKit.CompositeDisposable());
  }

  activate() {
    const {
      components,
      commands
    } = inkdrop;
    components.registerClass(SideTocPane.default);
    show();
    this.subscriptions.add(commands.add(document.body, {
      "sidetoc:sidetoc-toggle": toggle,
      "sidetoc:jump-next": jumpToNext,
      "sidetoc:jump-prev": jumpToPrev
    }));
  }

  deactivate() {
    const {
      components
    } = inkdrop;
    this.subscriptions.dispose();
    components.deleteClass(SideTocPane);
  }

}

const toggle = () => {
  const isVisible = inkdrop.layouts.indexOfComponentInLayout(layoutName, componentName) >= 0;
  isVisible ? hide() : show();
};

const show = () => {
  inkdrop.layouts.insertComponentToLayoutAfter(layoutName, "Editor", componentName);

  _dispatcher.default.dispatch({
    type: "ToggleShow"
  });
};

const hide = () => {
  inkdrop.layouts.removeComponentFromLayout(layoutName, componentName);
};

const jumpToNext = () => {
  _dispatcher.default.dispatch({
    type: "JumpToNext"
  });
};

const jumpToPrev = () => {
  _dispatcher.default.dispatch({
    type: "JumpToPrev"
  });
};

let plugin = new SideTocPlugin();
module.exports = {
  config: {
    highlightColor: {
      title: "highlight color",
      type: "string",
      default: "#C5EAFB"
    },
    width: {
      title: "side pane width",
      type: "integer",
      default: 200
    }
  },

  activate() {
    plugin.activate();
  },

  deactivate() {
    plugin.deactivate();
  }

};