'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import clsx from 'clsx';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}

type ToolbarBtn = {
  label: React.ReactNode;
  title: string;
  action: (editor: ReturnType<typeof useEditor>) => void;
  isActive?: (editor: ReturnType<typeof useEditor>) => boolean;
};

const TOOLBAR: (ToolbarBtn | 'divider')[] = [
  {
    label: <strong>B</strong>,
    title: 'Bold',
    action: (e) => e?.chain().focus().toggleBold().run(),
    isActive: (e) => !!e?.isActive('bold'),
  },
  {
    label: <em>I</em>,
    title: 'Italic',
    action: (e) => e?.chain().focus().toggleItalic().run(),
    isActive: (e) => !!e?.isActive('italic'),
  },
  {
    label: <span className="underline">U</span>,
    title: 'Underline',
    action: (e) => e?.chain().focus().toggleUnderline().run(),
    isActive: (e) => !!e?.isActive('underline'),
  },
  {
    label: <s>S</s>,
    title: 'Strikethrough',
    action: (e) => e?.chain().focus().toggleStrike().run(),
    isActive: (e) => !!e?.isActive('strike'),
  },
  'divider',
  {
    label: <span className="text-[11px] font-bold">X₂</span>,
    title: 'Subscript',
    action: (e) => e?.chain().focus().toggleSubscript().run(),
    isActive: (e) => !!e?.isActive('subscript'),
  },
  {
    label: <span className="text-[11px] font-bold">X²</span>,
    title: 'Superscript',
    action: (e) => e?.chain().focus().toggleSuperscript().run(),
    isActive: (e) => !!e?.isActive('superscript'),
  },
  'divider',
  {
    label: <span className="text-xs font-mono font-bold">H1</span>,
    title: 'Heading 1',
    action: (e) => e?.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (e) => !!e?.isActive('heading', { level: 1 }),
  },
  {
    label: <span className="text-xs font-mono font-bold">H2</span>,
    title: 'Heading 2',
    action: (e) => e?.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (e) => !!e?.isActive('heading', { level: 2 }),
  },
  'divider',
  {
    label: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
    title: 'Bullet list',
    action: (e) => e?.chain().focus().toggleBulletList().run(),
    isActive: (e) => !!e?.isActive('bulletList'),
  },
  {
    label: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/>
        <line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10H5"/>
        <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
      </svg>
    ),
    title: 'Numbered list',
    action: (e) => e?.chain().focus().toggleOrderedList().run(),
    isActive: (e) => !!e?.isActive('orderedList'),
  },
  'divider',
  {
    label: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
    title: 'Align left',
    action: (e) => e?.chain().focus().setTextAlign('left').run(),
    isActive: (e) => !!e?.isActive({ textAlign: 'left' }),
  },
  {
    label: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
    title: 'Align center',
    action: (e) => e?.chain().focus().setTextAlign('center').run(),
    isActive: (e) => !!e?.isActive({ textAlign: 'center' }),
  },
  {
    label: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/>
        <line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
    title: 'Align right',
    action: (e) => e?.chain().focus().setTextAlign('right').run(),
    isActive: (e) => !!e?.isActive({ textAlign: 'right' }),
  },
];

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Subscript,
      Superscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[72px] px-3 py-2 text-gray-900 text-sm',
      },
    },
  });

  // Sync external value changes (e.g. when form resets)
  const prevValue = typeof window !== 'undefined' ? value : '';
  if (editor && editor.getHTML() !== value && value === '') {
    editor.commands.clearContent();
  }

  return (
    <div className={clsx('border border-gray-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/60">
        {TOOLBAR.map((item, i) => {
          if (item === 'divider') {
            return <div key={`div-${i}`} className="w-px h-5 bg-gray-200 mx-1" />;
          }
          const active = item.isActive?.(editor) ?? false;
          return (
            <button
              key={item.title}
              type="button"
              title={item.title}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur
                item.action(editor);
              }}
              className={clsx(
                'w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors',
                active
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Editor area */}
      {placeholder && !editor?.getText() && (
        <div className="absolute pointer-events-none px-3 py-2 text-sm text-gray-400 select-none">{placeholder}</div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
