// Rich-text note editor for session notes (REQUIREMENTS §4.8): a TipTap editor with a small
// toolbar (undo/redo, text size, bold, italic, underline, highlight, text + background colour,
// bullet list, tick list). Colours are stored as CSS variables (var(--nt-gold)) so every skin
// can make them readable on its own background.
import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { MAX_CHARS, NOTE_COLORS } from "../notes";
import { foldIndex } from "../text";

export interface NoteEditorHandle {
  /** Select the first match of `q` and scroll to it. False if there's none. */
  findFirst(q: string): boolean;
  focus(): void;
}

const SIZES = [
  { id: "small", name: "Small", value: "0.85em" },
  { id: "normal", name: "Normal", value: null },
  { id: "large", name: "Large", value: "1.3em" },
  { id: "huge", name: "Huge", value: "1.7em" },
] as const;

const textVar = (id: string) => `var(--nt-${id})`;
const bgVar = (id: string) => `var(--nb-${id})`;
const HIGHLIGHT = bgVar("gold");

export function NoteEditor({
  html,
  label,
  find,
  onChange,
  handle,
}: {
  html: string;
  label: string;
  /** Search text to select once the editor is ready (opening a tab from a search). */
  find?: string;
  onChange: (html: string, chars: number) => void;
  handle?: Ref<NoteEditorHandle>;
}) {
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        orderedList: false,
        strike: false,
        link: false,
      }),
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount.configure({ limit: MAX_CHARS }),
      Placeholder.configure({ placeholder: "Write anything: plot threads, names, what happened last time…" }),
    ],
    content: html,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: { attributes: { class: "note-doc", "aria-label": label, "aria-multiline": "true", role: "textbox" } },
    onUpdate: ({ editor }) => changeRef.current(editor.getHTML(), editor.storage.characterCount.characters()),
  });

  const findFirst = (q: string) => findIn(editor, q);
  useImperativeHandle(handle, () => ({ findFirst, focus: () => editor.commands.focus("end") }), [editor]);
  useEffect(() => {
    if (find?.trim()) findIn(editor, find);
    // Only when the editor (a tab) opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return (
    <div className="note-editor">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="note-body" />
    </div>
  );
}

function findIn(editor: Editor, q: string): boolean {
  const needle = q.trim();
  if (!needle) return false;
  let hit: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (hit) return false;
    if (!node.isTextblock) return true;
    // One character per inline leaf (line breaks) so offsets line up with document positions.
    // Case and accents don't matter; fold keeps positions, so the match lines up with the text.
    const text = node.textBetween(0, node.content.size, undefined, "￼");
    const i = foldIndex(text, needle);
    if (i >= 0) hit = { from: pos + 1 + i, to: pos + 1 + i + needle.length };
    return false;
  });
  if (!hit) return false;
  editor.chain().focus().setTextSelection(hit).scrollIntoView().run();
  return true;
}

// ---------------------------------------------------------------------------------------------
// Toolbar

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      highlight: e.isActive("highlight"),
      highlightColor: (e.getAttributes("highlight").color as string | undefined) ?? null,
      color: (e.getAttributes("textStyle").color as string | undefined) ?? null,
      size: (e.getAttributes("textStyle").fontSize as string | undefined) ?? null,
      bullet: e.isActive("bulletList"),
      task: e.isActive("taskList"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const run = (fn: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => fn(editor.chain().focus()).run();
  const size = SIZES.find((x) => x.value === s.size) ?? SIZES[1];

  return (
    <div className="note-toolbar" role="toolbar" aria-label="Formatting">
      <ToolButton label="Undo" disabled={!s.canUndo} onClick={() => run((c) => c.undo())}>
        <Icon d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
      </ToolButton>
      <ToolButton label="Redo" disabled={!s.canRedo} onClick={() => run((c) => c.redo())}>
        <Icon d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
      </ToolButton>
      <span className="note-sep" aria-hidden="true" />
      <Pop label={`Text size: ${size.name}`} button={<><Icon d="M4 7V5h10v2M9 5v14M7 19h4M14 13v-1h7v1M17.5 12v7M16 19h3" /><Caret /></>}>
        {(close) =>
          SIZES.map((x) => (
            <button
              key={x.id}
              type="button"
              className="note-menu-item"
              aria-pressed={x.id === size.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                run((c) => (x.value ? c.setFontSize(x.value) : c.unsetFontSize()));
                close();
              }}
            >
              <span style={{ fontSize: x.value ?? "1em" }}>{x.name}</span>
              {x.id === size.id && <Tick />}
            </button>
          ))
        }
      </Pop>
      <span className="note-sep" aria-hidden="true" />
      <ToolButton label="Bold" pressed={s.bold} onClick={() => run((c) => c.toggleBold())}>
        <b className="note-glyph">B</b>
      </ToolButton>
      <ToolButton label="Italic" pressed={s.italic} onClick={() => run((c) => c.toggleItalic())}>
        <i className="note-glyph">I</i>
      </ToolButton>
      <ToolButton label="Underline" pressed={s.underline} onClick={() => run((c) => c.toggleUnderline())}>
        <u className="note-glyph">U</u>
      </ToolButton>
      <ToolButton label="Highlight" pressed={s.highlight} onClick={() => run((c) => (s.highlight ? c.unsetHighlight() : c.setHighlight({ color: HIGHLIGHT })))}>
        <Icon d="m9 11-6 6v3h9l3-3M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
      </ToolButton>
      <Pop
        label="Text and background colour"
        button={
          <>
            <span className="note-color-a" aria-hidden="true">
              A<span style={{ background: s.color ?? "currentColor" }} />
            </span>
            <Caret />
          </>
        }
      >
        {(close) => (
          <div className="note-colors">
            <span className="note-menu-label">Text colour</span>
            <div className="note-swatches">
              <Swatch name="Default" on={!s.color} onPick={() => (run((c) => c.unsetColor()), close())} />
              {NOTE_COLORS.map((c) => (
                <Swatch key={c.id} name={c.name} fill={textVar(c.id)} on={s.color === textVar(c.id)} onPick={() => (run((x) => x.setColor(textVar(c.id))), close())} />
              ))}
            </div>
            <span className="note-menu-label">Background</span>
            <div className="note-swatches">
              <Swatch name="None" on={!s.highlightColor} onPick={() => (run((c) => c.unsetHighlight()), close())} />
              {NOTE_COLORS.map((c) => (
                <Swatch key={c.id} name={c.name} fill={bgVar(c.id)} on={s.highlightColor === bgVar(c.id)} onPick={() => (run((x) => x.setHighlight({ color: bgVar(c.id) })), close())} />
              ))}
            </div>
          </div>
        )}
      </Pop>
      <span className="note-sep" aria-hidden="true" />
      <ToolButton label="Bullet list" pressed={s.bullet} onClick={() => run((c) => c.toggleBulletList())}>
        <Icon d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />
      </ToolButton>
      <ToolButton label="Tick list" pressed={s.task} onClick={() => run((c) => c.toggleTaskList())}>
        <Icon d="m3 7 2 2 4-4M3 17l2 2 4-4M13 6h8M13 12h8M13 18h8" />
      </ToolButton>
    </div>
  );
}

function ToolButton({ label, pressed, disabled, onClick, children }: { label: string; pressed?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="note-tool"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      // Keep the text selection in the editor while clicking the toolbar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** A toolbar button with a small menu under it. */
function Pop({ label, button, children }: { label: string; button: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="note-pop" ref={ref}>
      <button type="button" className="note-tool wide" aria-label={label} title={label} aria-expanded={open} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((o) => !o)}>
        {button}
      </button>
      {open && <div className="note-menu">{children(() => setOpen(false))}</div>}
    </div>
  );
}

function Swatch({ name, fill, on, onPick }: { name: string; fill?: string; on: boolean; onPick: () => void }) {
  return (
    <button type="button" className={`note-swatch${fill ? "" : " none"}`} style={fill ? { background: fill } : undefined} aria-label={name} title={name} aria-pressed={on} onMouseDown={(e) => e.preventDefault()} onClick={onPick}>
      {on ? <Tick /> : !fill && <Icon d="M5 19 19 5" />}
    </button>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const Caret = () => (
  <svg className="note-caret" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const Tick = () => (
  <svg className="note-tick" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);
