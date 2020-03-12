'use babel'

import { CompositeDisposable } from 'event-kit'
import * as SideTocPane from './sidetoc-pane'

class SideTocPlugin {
  subscriptions = new CompositeDisposable()

  activate() {
    const { components, commands } = inkdrop
    components.registerClass(SideTocPane.default)
    SideTocPane.show()

    this.subscriptions.add(
      commands.add(document.body, {
        'sidetoc:toggle-sidetoc': SideTocPane.toggle
      })
    )
  }

  deactivate() {
    const { components } = inkdrop

    this.subscriptions.dispose()
    components.deleteClass(SideTocPane.default)
  }
}

module.exports = new SideTocPlugin()
