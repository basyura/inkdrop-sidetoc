'use babel'

import * as React from 'react'

export default function SideTocPane(props) {

  let headers = []
  let min = 999
  props.editingNote.body.split("\n").forEach(v => {
    // check
    if (!isValid(v)) {
      return
    }
    // count #
    let i = 0
    for (; i < v.length; i++) {
      if (v[i] != "#") {
        break
      }
    }
    // push header item
    headers.push({ count: i, str: v.replace(/^#*? /, "") })
    if (i < min) {
      min = i
    }
  })

  return (
    <div className="sidetoc-pane">
      {headers.map((v) => <li style={{ marginLeft: 20 * (v.count - min) }}>{v.str}</li>)}
    </div>
  )
}

function isValid(v) {

    if (!v.startsWith("#")) {
      return false
    }
    if (v == "#" || v.match(/^#*? *$/)) {
      return false
    }

    return true
}

export const componentName = SideTocPane.name

const layoutName = 'mde'

export function toggle() {
  const isVisible = inkdrop.layouts.indexOfComponentInLayout(layoutName, componentName) >= 0
  isVisible ? hide() : show()
}

export function hide() {
  inkdrop.layouts.removeComponentFromLayout(layoutName, componentName)
}

export function show() {
  inkdrop.layouts.insertComponentToLayoutAfter(layoutName, 'Editor', componentName)
}
