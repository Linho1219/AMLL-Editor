<template>
  <div class="r-codemirror-shell" ref="shellEl"></div>
</template>

<script setup lang="ts">
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { highlightSelectionMatches } from '@codemirror/search'
import {
  Compartment,
  EditorState,
  type Extension,
  StateEffect,
  StateField,
} from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  crosshairCursor,
  drawSelection,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view'
import { nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'

const [content] = defineModel<string>('content')
const [scrollTop] = defineModel<number>('scrollTop')
const [currentLine] = defineModel<number>('currentLine')

const props = defineProps<{
  extensions?: Extension[]
  showLineNumbers?: boolean
  highlightPattern?: { cycleLength: number; map: Record<number, string> }
  readonly?: boolean
}>()

function highlightCurrentLine() {
  return ViewPlugin.fromClass(
    class {
      decorations
      constructor(view: EditorView) {
        this.decorations = this.getDeco(view)
      }
      update(update: ViewUpdate) {
        if (
          update.selectionSet ||
          update.docChanged ||
          update.viewportChanged ||
          update.state.field(dropCursorPos, false) !== update.startState.field(dropCursorPos, false)
        ) {
          this.decorations = this.getDeco(update.view)
        }
      }
      getDeco(view: EditorView) {
        const dropPos = view.state.field(dropCursorPos, false)
        const pos = dropPos != null ? dropPos : view.state.selection.main.head
        const line = view.state.doc.lineAt(pos)
        currentLine.value = line.number
        return Decoration.set([
          Decoration.line({ attributes: { class: 'cm-current-line-highlight' } }).range(line.from),
        ])
      }
    },
    { decorations: (v) => v.decorations },
  )
}

// Drop cursor implementation
// Copied from CodeMirror's official extension
// so that fields can be tracked here
const setDropCursorPos = StateEffect.define<number | null>({
  map(pos, mapping) {
    return pos == null ? null : mapping.mapPos(pos)
  },
})
const dropCursorPos = StateField.define<number | null>({
  create() {
    return null
  },
  update(pos, tr) {
    if (pos != null) pos = tr.changes.mapPos(pos)
    return tr.effects.reduce((pos, e) => (e.is(setDropCursorPos) ? e.value : pos), pos)
  },
})
export interface MeasureRequest<T> {
  /// Called in a DOM read phase to gather information that requires
  /// DOM layout. Should _not_ mutate the document.
  read(view: EditorView): T
  /// Called in a DOM write phase to update the document. Should _not_
  /// do anything that triggers DOM layout.
  write?(measure: T, view: EditorView): void
  /// When multiple requests with the same key are scheduled, only the
  /// last one will actually be run.
  key?: any
}
const drawDropCursor = ViewPlugin.fromClass(
  class {
    cursor: HTMLElement | null = null
    measureReq: MeasureRequest<{ left: number; top: number; height: number } | null>
    constructor(readonly view: EditorView) {
      this.measureReq = { read: this.readPos.bind(this), write: this.drawCursor.bind(this) }
    }
    update(update: ViewUpdate) {
      let cursorPos = update.state.field(dropCursorPos)
      if (cursorPos == null) {
        if (this.cursor != null) {
          this.cursor?.remove()
          this.cursor = null
        }
      } else {
        if (!this.cursor) {
          this.cursor = this.view.scrollDOM.appendChild(document.createElement('div'))
          this.cursor!.className = 'cm-dropCursor'
        }
        if (
          update.startState.field(dropCursorPos) != cursorPos ||
          update.docChanged ||
          update.geometryChanged
        )
          this.view.requestMeasure(this.measureReq)
      }
    }
    readPos(): { left: number; top: number; height: number } | null {
      let { view } = this
      let pos = view.state.field(dropCursorPos)
      let rect = pos != null && view.coordsAtPos(pos)
      if (!rect) return null
      let outer = view.scrollDOM.getBoundingClientRect()
      return {
        left: rect.left - outer.left + view.scrollDOM.scrollLeft * view.scaleX,
        top: rect.top - outer.top + view.scrollDOM.scrollTop * view.scaleY,
        height: rect.bottom - rect.top,
      }
    }
    drawCursor(pos: { left: number; top: number; height: number } | null) {
      if (this.cursor) {
        let { scaleX, scaleY } = this.view
        if (pos) {
          this.cursor.style.left = pos.left / scaleX + 'px'
          this.cursor.style.top = pos.top / scaleY + 'px'
          this.cursor.style.height = pos.height / scaleY + 'px'
        } else {
          this.cursor.style.left = '-100000px'
        }
      }
    }
    destroy() {
      if (this.cursor) this.cursor.remove()
    }
    setDropPos(pos: number | null) {
      if (this.view.state.field(dropCursorPos) != pos)
        this.view.dispatch({ effects: setDropCursorPos.of(pos) })
    }
  },
  {
    eventObservers: {
      dragover(event) {
        this.setDropPos(this.view.posAtCoords({ x: event.clientX, y: event.clientY }))
      },
      dragleave(event) {
        if (
          event.target == this.view.contentDOM ||
          !this.view.contentDOM.contains(event.relatedTarget as HTMLElement)
        )
          this.setDropPos(null)
      },
      dragend() {
        this.setDropPos(null)
      },
      drop() {
        this.setDropPos(null)
      },
    },
  },
)
function dropCursor(): Extension {
  return [dropCursorPos, drawDropCursor]
}

const shellEl = useTemplateRef('shellEl')
const editorInstance = shallowRef<EditorView | null>(null)
const highlightCompartment = new Compartment()
const editableCompartment = new Compartment()
onMounted(() => {
  if (!shellEl.value) return
  editorInstance.value = new EditorView({
    doc: content.value,
    parent: shellEl.value,
    extensions: [
      highlightCurrentLine(),
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      crosshairCursor(),
      highlightSelectionMatches(),
      history(),
      EditorState.allowMultipleSelections.of(true),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return
        const val = update.state.doc.toString()
        content.value = val
      }),
      EditorView.domEventHandlers({
        scroll: (_event, view) => {
          scrollTop.value = view.scrollDOM.scrollTop
        },
      }),
      props.showLineNumbers ? lineNumbers() : null,
      highlightCompartment.of([]),
      editableCompartment.of(EditorView.editable.of(!props.readonly)),
      ...(props.extensions || []),
    ].filter((e) => !!e),
  })
  editorInstance.value
})
onUnmounted(() => {
  nextTick(() => editorInstance.value?.destroy())
})

watch(content, (newVal) => {
  if (!editorInstance.value) return
  const currentDoc = editorInstance.value.state.doc.toString()
  if (newVal !== currentDoc) {
    editorInstance.value.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: newVal },
    })
  }
})
watch(scrollTop, (newVal) => {
  if (!editorInstance.value || newVal === undefined) return
  const el = editorInstance.value.scrollDOM
  if (el.scrollTop === newVal) return
  if (Math.abs(el.scrollTop - newVal) > 1) {
    el.scrollTop = newVal
    scrollTop.value = newVal
  }
})
watch(currentLine, (newVal) => {
  if (!editorInstance.value || newVal === undefined) return
  const currentLine = editorInstance.value.state.doc.lineAt(
    editorInstance.value.state.selection.main.head,
  ).number
  const maxLine = editorInstance.value.state.doc.lines
  if (newVal > maxLine) newVal = maxLine
  if (currentLine === newVal) return
  const line = editorInstance.value.state.doc.line(newVal)
  editorInstance.value.dispatch({
    selection: { anchor: line.from },
    scrollIntoView: true,
  })
})
watch(
  () => props.readonly,
  (val) => {
    if (!editorInstance.value) return
    editorInstance.value.dispatch({
      effects: editableCompartment.reconfigure(EditorView.editable.of(!val)),
    })
  },
)

function createCycleHighlightExtension(pattern: {
  cycleLength: number
  map: Record<number, string>
}) {
  const nonMatchClass = 'cm-cycle-highlight-else'
  return ViewPlugin.fromClass(
    class {
      decorations
      constructor(view: EditorView) {
        this.decorations = this.buildDeco(view)
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDeco(update.view)
        }
      }
      buildDeco(view: EditorView) {
        const builder = []
        const { cycleLength, map } = pattern
        for (const { from, to } of view.visibleRanges) {
          let line = view.state.doc.lineAt(from)
          while (line.from < to) {
            const cls = map[(line.number - 1) % cycleLength]
            if (cls) builder.push(Decoration.line({ attributes: { class: cls } }).range(line.from))
            else
              builder.push(
                Decoration.line({ attributes: { class: nonMatchClass } }).range(line.from),
              )
            if (line.to >= to) break
            line = view.state.doc.line(line.number + 1)
          }
        }
        return Decoration.set(builder)
      }
    },
    { decorations: (v) => v.decorations },
  )
}

watch(
  () => props.highlightPattern,
  (pattern) => {
    if (!editorInstance.value) return
    const extension = pattern ? createCycleHighlightExtension(pattern) : []
    editorInstance.value.dispatch({
      effects: highlightCompartment.reconfigure(extension),
    })
  },
  { immediate: true, deep: true },
)
</script>

<style lang="scss">
.r-codemirror-shell {
  --cm-font-family: var(--font-monospace);
  background-color: var(--p-form-field-background);
  border: 1px solid var(--p-form-field-border-color);
  border-radius: var(--p-form-field-border-radius);
  overflow: hidden;
  .cm-editor {
    height: 100%;
    width: 100%;
    &.cm-focused {
      outline: none;
    }
  }
  .cm-content {
    padding-bottom: 5rem;
  }
  .cm-scroller {
    font-family: var(--cm-font-family);
    font-size: 1rem;
  }
  .cm-current-line-highlight {
    box-shadow: 0 0 0 0.15rem inset color-mix(in srgb, var(--p-primary-color), transparent 50%);
  }
  .cm-gutters {
    opacity: 0.8;
    background-color: var(--p-button-secondary-background);
    border-color: var(--p-content-border-color);
    color: var(--p-button-secondary-color);
  }
  .cm-cursor,
  .cm-dropCursor {
    border-color: color-mix(in srgb, currentColor 20%, var(--p-primary-color) 80%);
    border-width: 2px;
  }
  .cm-selectionBackground {
    background-color: color-mix(in srgb, var(--p-primary-color), transparent 60%) !important;
    .cm-focused > .cm-scroller > .cm-selectionLayer & {
      filter: none;
    }
  }
  .cm-selectionMatch {
    background-color: color-mix(in srgb, currentColor 20%, transparent 80%);
  }
}
</style>
