'use babel'

import * as React from 'react'

export default class SideTocPane extends React.Component {

  componentWillMount () {
    this.initializeSettings()
    this.updateState()

    inkdrop.onEditorLoad(editor => {
        this.updateState();
        const { cm } = editor;
        this.codeMirror = cm
        cm.on("cursorActivity", this.handleCursorActivity);
        cm.on("update", this.handleUpdate);
    });
  }

  render() {
    return (
      <div className="sidetoc-pane" style={{fontFamily: this.fontFamily}}>
        {this.state.headers.map(v => 
            <li style={this.toStyle(v)} onClick={this.handleClick.bind(this, v)}>
              {v.str}
            </li>
        )}
      </div>
    )
  }

  updateState = () => {
    let [headers, min] =  this.extractHeaders(this.props)
    let len = this.props.editingNote.body.length
    this.setState({headers: headers, min: min, len: len})
  }

  handleUpdate = _ => {
    if (this.state.len == this.props.editingNote.body.length) {
      return
    }
    this.updateState();
  }

  handleCursorActivity = editor => {
    let cur = editor.getCursor()
    let len = this.state.headers.length;
    for (let i = 0; i < len; i++) {
      let header = this.state.headers[i];
      if (cur.line >= header.rowStart && cur.line <= header.rowEnd) {
        if (this.state.currentSection != header.str) {
          this.setState({ currentSection: header.str})
        }
        break
      }
    }
  };
  /*
   initializeSettings
   setup and observe config
  */
  initializeSettings = () => {
    this.fontFamily = inkdrop.config.get('editor.fontFamily')
    inkdrop.config.observe('editor.fontFamily', newValue => {
      this.hicolor = newValue
    })

    this.hicolor = inkdrop.config.get("sidetoc.highlightColor")
    document.documentElement.style.setProperty('--inkdrop-sidetoc-highlight-color', this.hicolor)
    inkdrop.config.observe('sidetoc.highlightColor', newValue => {
      this.hicolor = newValue
      document.documentElement.style.setProperty('--inkdrop-sidetoc-highlight-color', this.hicolor)
    })
  }

  // scroll to header
  handleClick = (header, _) => {
    this.codeMirror.scrollTo(0, 99999)
    this.codeMirror.setCursor(header.rowStart, 0)
    this.codeMirror.focus()
  }

  extractHeaders = (props) => {
    // section list which starting with #.
    let headers = []
    // minimum section level
    let min = 999
    let row = -1
    let before = null
    props.editingNote.body.split("\n").forEach(v => {
      row++
      // check
      if (!isValid(v)) {
        return
      }
      // count of #
      let i = 0
      for (; i < v.length; i++) {
        if (v[i] != "#") {
          break
        }
      }
      // create header item
      let header = { count: i, str: v.replace(/^#*? /, ""), rowStart: row }
      // apply header end row
      if (before != null) {
        before.rowEnd = row - 1
      }
      before = header
      headers.push(header)
      if (i < min) {
        min = i
      }
    })
  
    if (headers.length != 0) {
      headers[headers.length - 1].rowEnd = row
    }

    return [headers, min]
  }

  toStyle = (header) => {
    let style = { marginLeft: 20 * (header.count - this.state.min) };
    if (this.state.currentSection == header.str) {
      style.backgroundColor = this.hicolor
    }

    return style;
  }
}

export const componentName = "SideTocPane";

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

function isValid(v) {

    if (!v.startsWith("#")) {
      return false
    }
    if (v == "#" || v.match(/^#*? *$/)) {
      return false
    }

    return true
}
