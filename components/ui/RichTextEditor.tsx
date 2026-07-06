'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Image from '@tiptap/extension-image';
import clsx from 'clsx';
import { useRef, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
  plainTextMode?: boolean;
  /** Endpoint to POST image uploads to. If provided, an image button appears in the toolbar. */
  imageUploadUrl?: string;
}

type ToolbarBtn = {
  label: React.ReactNode;
  title: string;
  action: (editor: ReturnType<typeof useEditor>) => void;
  isActive?: (editor: ReturnType<typeof useEditor>) => boolean;
  richOnly?: boolean; // hidden when plainTextMode=true
};

const TOOLBAR: (ToolbarBtn | 'divider')[] = [
  {
    label: <strong>B</strong>,
    title: 'Bold',
    richOnly: true,
    action: (e) => e?.chain().focus().toggleBold().run(),
    isActive: (e) => !!e?.isActive('bold'),
  },
  {
    label: <em>I</em>,
    title: 'Italic',
    richOnly: true,
    action: (e) => e?.chain().focus().toggleItalic().run(),
    isActive: (e) => !!e?.isActive('italic'),
  },
  {
    label: <span className="underline">U</span>,
    title: 'Underline',
    richOnly: true,
    action: (e) => e?.chain().focus().toggleUnderline().run(),
    isActive: (e) => !!e?.isActive('underline'),
  },
  {
    label: <s>S</s>,
    title: 'Strikethrough',
    richOnly: true,
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
    label: <span className="text-[11px] font-bold tracking-wide">AA</span>,
    title: 'UPPERCASE',
    action: (e) => {
      if (!e) return;
      const { from, to } = e.state.selection;
      if (from === to) return;
      const selected = e.state.doc.textBetween(from, to, ' ');
      e.chain().focus().deleteRange({ from, to }).insertContentAt(from, selected.toUpperCase()).run();
    },
  },
  {
    label: <span className="text-[11px] font-bold tracking-wide">aa</span>,
    title: 'lowercase',
    action: (e) => {
      if (!e) return;
      const { from, to } = e.state.selection;
      if (from === to) return;
      const selected = e.state.doc.textBetween(from, to, ' ');
      e.chain().focus().deleteRange({ from, to }).insertContentAt(from, selected.toLowerCase()).run();
    },
  },
  {
    label: <span className="text-[11px] font-bold tracking-wide">Aa</span>,
    title: 'Title Case',
    action: (e) => {
      if (!e) return;
      const { from, to } = e.state.selection;
      if (from === to) return;
      const selected = e.state.doc.textBetween(from, to, ' ');
      const titled = selected.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      e.chain().focus().deleteRange({ from, to }).insertContentAt(from, titled).run();
    },
  },
  'divider',
  {
    label: <span className="text-xs font-mono font-bold">H1</span>,
    title: 'Heading 1',
    richOnly: true,
    action: (e) => e?.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (e) => !!e?.isActive('heading', { level: 1 }),
  },
  {
    label: <span className="text-xs font-mono font-bold">H2</span>,
    title: 'Heading 2',
    richOnly: true,
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
    richOnly: true,
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
    richOnly: true,
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
    richOnly: true,
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
    richOnly: true,
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
    richOnly: true,
    action: (e) => e?.chain().focus().setTextAlign('right').run(),
    isActive: (e) => !!e?.isActive({ textAlign: 'right' }),
  },
];

export default function RichTextEditor({ value, onChange, placeholder, className, plainTextMode = false, imageUploadUrl }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Subscript,
      Superscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: true, allowBase64: false }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[72px] px-3 py-2 text-gray-900 text-sm [&_img]:max-w-full [&_img]:max-h-64 [&_img]:rounded-lg [&_img]:my-1',
      },
    },
  });

  // Sync external value changes (e.g. when form resets)
  if (editor && editor.getHTML() !== value && value === '') {
    editor.commands.clearContent();
  }

  /** Handle image file selected — uploads to imageUploadUrl and inserts into editor */
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so same file can be re-selected
    if (!file || !imageUploadUrl || !editor) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      // Get auth token for the upload
      const { auth } = await import('@/lib/auth');
      const token = auth.getToken();

      const res = await fetch(imageUploadUrl, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'ngrok-skip-browser-warning': '1',
        },
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const json = await res.json();
      const rawUrl: string = json?.data?.url ?? json?.url ?? '';
      if (!rawUrl) throw new Error('No URL returned from server');

      // Convert relative path to proxied URL so it loads through Next.js
      const imageUrl = rawUrl.startsWith('http')
        ? rawUrl
        : `/api${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;

      editor.chain().focus().setImage({ src: imageUrl }).run();
    } catch (err: any) {
      console.error('[RichTextEditor] Image upload failed:', err);
      alert(`Image upload failed: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

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

        {/* Image upload button — only shown when imageUploadUrl is provided */}
        {imageUploadUrl && (
          <>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <button
              type="button"
              title="Insert image"
              disabled={uploading}
              onMouseDown={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
              className={clsx(
                'w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors',
                uploading
                  ? 'bg-blue-100 text-blue-400 cursor-wait'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              )}
            >
              {uploading ? (
                /* Spinner */
                <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              ) : (
                /* Image icon */
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={handleImageFile}
            />
          </>
        )}
      </div>

      {/* Editor area */}
      {placeholder && !editor?.getText() && (
        <div className="absolute pointer-events-none px-3 py-2 text-sm text-gray-400 select-none">{placeholder}</div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
