"use babel";

import { CompositeDisposable } from "event-kit";
import * as SideTocPane from "./sidetoc-pane";

class SideTocPlugin {
  subscriptions = new CompositeDisposable();

  activate() {
    const { components, commands } = inkdrop;
    components.registerClass(SideTocPane.default);
    SideTocPane.show();

    this.subscriptions.add(
      commands.add(document.body, {
        "sidetoc:sidetoc-toggle": SideTocPane.toggle,
      })
    );
  }

  deactivate() {
    const { components } = inkdrop;

    this.subscriptions.dispose();
    components.deleteClass(SideTocPane);
  }
}

let plugin = new SideTocPlugin();
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
