"use babel";

import { CompositeDisposable } from "event-kit";
import * as SideTocPane from "./sidetoc-pane";

class SideTocPlugin {
  subscriptions = new CompositeDisposable();

  /*
  config: {
    someInt: {
      title: 'Some int',
      type: 'integer',
      default: 34,
      minimum: 10
    }
  }
  */

  activate() {
    const { components, commands } = inkdrop;
    components.registerClass(SideTocPane.default);
    SideTocPane.show();

    this.subscriptions.add(
      commands.add(document.body, {
        "sidetoc:toggle-sidetoc": SideTocPane.toggle
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
      title: 'highlight color',
      type: 'string',
      default: "#C5EAFB"
    }
  },
  activate() {
    plugin.activate()
  },
  deactivate() {
    plugin.deactivate()
  }
}
