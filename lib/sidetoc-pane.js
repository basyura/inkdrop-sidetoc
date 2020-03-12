'use babel'

import * as React from 'react'

export default function SideTocPane(props) {

  let body = props.editingNote.body
  let buf = []
  console.log("hi")
  body.split("\n").forEach(v => {
    console.log(v)
    if (v.startsWith("#")) {
      buf.push(v)
    }
  })

  return (
    <div className="sidetoc-pane">
    TOC
    <pre>{buf.join("\n")}</pre>
    </div>
  )
}

export const componentName = SideTocPane.name

const layoutName = 'mde'

export function toggle() {
  const isVisible =
    inkdrop.layouts.indexOfComponentInLayout(layoutName, componentName) >= 0
  isVisible ? hide() : show()
}

export function hide() {
  inkdrop.layouts.removeComponentFromLayout(layoutName, componentName)
}

export function show() {
  inkdrop.layouts.insertComponentToLayoutAfter(
    layoutName,
    'Editor',
    componentName
  )
}
