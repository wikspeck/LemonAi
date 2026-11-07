"use client";
import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "@tiptap/markdown";
import { Icon } from "./icons";

export default function RichEditor({ value, onChange, onSelect }: { value: string; onChange: (value: string) => void; onSelect: (text: string) => void }) {
  const handlers = useRef({ onChange, onSelect });
  useEffect(() => { handlers.current = { onChange, onSelect }; }, [onChange, onSelect]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: { openOnClick: false } }), TableKit, TaskList, TaskItem.configure({ nested: true }), Markdown],
    content: value, contentType: "markdown",
    editorProps: { attributes: { class: "ln-markdown ln-rich-content", role: "textbox", "aria-label": "Rich note content", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => handlers.current.onChange(editor.getMarkdown()),
    onSelectionUpdate: ({ editor }) => { const { from, to } = editor.state.selection; handlers.current.onSelect(from === to ? "" : editor.state.doc.textBetween(from, to, "\n")); },
  });
  useEffect(() => { if (editor && editor.getMarkdown() !== value) editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false }); }, [value, editor]);
  if (!editor) return <p className="ln-muted" style={{ padding: 25 }}>Opening editor…</p>;
  return <div><div className="ln-formatbar"><button aria-label="Bold" aria-pressed={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button><button aria-label="Italic" aria-pressed={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button><button aria-label="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H₂</button><button aria-label="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}><Icon name="list" size={17}/></button><button aria-label="Checklist" onClick={() => editor.chain().focus().toggleTaskList().run()}>☑</button><button aria-label="Table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()}>▦</button><button aria-label="Add table row" disabled={!editor.isActive("table")} onClick={() => editor.chain().focus().addRowAfter().run()}>+ row</button><button aria-label="Undo" onClick={() => editor.chain().focus().undo().run()}>↶</button><button aria-label="Redo" onClick={() => editor.chain().focus().redo().run()}>↷</button></div><EditorContent editor={editor}/></div>;
}
