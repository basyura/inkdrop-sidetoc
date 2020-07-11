"use babel";

import { CompositeDisposable } from "event-kit";
import * as SideTocPane from "./sidetoc-pane";
import dispatcher from "./dispatcher";
import { Inkdrop, DispatchAction } from "./types";

const componentName = "SideTocPane";
const layoutName = "mde";

declare var inkdrop: Inkdrop;

class SideTocPlugin {
  subscriptions = new CompositeDisposable();

  activate() {
    const { components, commands } = inkdrop;
    components.registerClass(SideTocPane.default);
    show();

    this.subscriptions.add(
      commands.add(document.body, {
        "sidetoc:sidetoc-toggle": toggle,
        "sidetoc:jump-next": jumpToNext,
        "sidetoc:jump-prev": jumpToPrev,
      })
    );
  }

  deactivate() {
    dispatcher.dispatch(<DispatchAction>{ type: "Deactivate" });

    this.subscriptions.dispose();

    const { components, layouts } = inkdrop;
    layouts.removeComponentFromLayout(layoutName, componentName);
    components.deleteClass(SideTocPane);
  }
}

const show = () => {
  inkdrop.layouts.insertComponentToLayoutAfter(
    layoutName,
    "Editor",
    componentName
  );
  dispatcher.dispatch({ type: "Activate" });
};

/* dispachers */
const toggle = () => dispatcher.dispatch(<DispatchAction>{ type: "Toggle" });
const jumpToNext = () =>
  dispatcher.dispatch(<DispatchAction>{ type: "JumpToNext" });
const jumpToPrev = () =>
  dispatcher.dispatch(<DispatchAction>{ type: "JumpToPrev" });

const plugin = new SideTocPlugin();
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
  },
  activate() {
    plugin.activate();
  },
  deactivate() {
    plugin.deactivate();
  },
};
