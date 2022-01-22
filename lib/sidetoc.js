"use babel";
import { CompositeDisposable } from "event-kit";
import * as SideTocPane from "./sidetoc-pane";
import dispatcher from "./dispatcher";
var componentName = "SideTocPane";
var layoutName = "mde";
var SideTocPlugin = /** @class */ (function () {
    function SideTocPlugin() {
        this.subscriptions = new CompositeDisposable();
    }
    SideTocPlugin.prototype.activate = function () {
        var components = inkdrop.components, commands = inkdrop.commands;
        components.registerClass(SideTocPane.default);
        show();
        this.subscriptions.add(commands.add(document.body, {
            "sidetoc:sidetoc-toggle": toggle,
            "sidetoc:jump-next": jumpToNext,
            "sidetoc:jump-prev": jumpToPrev,
            "sidetoc:width-increase": increaseWidth,
            "sidetoc:width-decrease": decreaseWidth,
            "sidetoc:width-reset": resetWidth,
            "sidetoc:wraptext-toggle": toggleTextwrap,
        }));
    };
    SideTocPlugin.prototype.deactivate = function () {
        dispatcher.dispatch({ type: "Deactivate" });
        this.subscriptions.dispose();
        var components = inkdrop.components, layouts = inkdrop.layouts;
        layouts.removeComponentFromLayout(layoutName, componentName);
        components.deleteClass(SideTocPane);
    };
    return SideTocPlugin;
}());
var show = function () {
    inkdrop.layouts.insertComponentToLayoutAfter(layoutName, "Editor", componentName);
    dispatcher.dispatch({ type: "Activate" });
};
/* dispachers */
var toggle = function () { return dispatcher.dispatch({ type: "Toggle" }); };
var jumpToNext = function () { return dispatcher.dispatch({ type: "JumpToNext" }); };
var jumpToPrev = function () { return dispatcher.dispatch({ type: "JumpToPrev" }); };
var increaseWidth = function () { return dispatcher.dispatch({ type: "IncreaseWidth" }); };
var decreaseWidth = function () { return dispatcher.dispatch({ type: "DecreaseWidth" }); };
var resetWidth = function () { return dispatcher.dispatch({ type: "ResetWidth" }); };
var toggleTextwrap = function () { return dispatcher.dispatch({ type: "ToggleTextwrap" }); };
var plugin = new SideTocPlugin();
module.exports = {
    config: {
        highlightColor: {
            title: "highlight color",
            type: "string",
            default: "#C5EAFB",
        },
        width: {
            title: "side pane width",
            type: "integer",
            default: 200,
        },
        increaseWidth: {
            title: "increase pane width",
            type: "integer",
            default: 10,
        },
        textwrap: {
            title: "wrap overflow text",
            type: "boolean",
            default: true,
        },
    },
    activate: function () {
        plugin.activate();
    },
    deactivate: function () {
        plugin.deactivate();
    },
};
