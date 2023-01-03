'use client';

import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Link from '@tiptap/extension-link';
import ListItem from '@tiptap/extension-list-item';
import OrderedList from '@tiptap/extension-ordered-list';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Content, EditorContent, useEditor } from '@tiptap/react';
import { ChangeEvent, forwardRef, TextareaHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

const RichTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, name, onChange, value }, ref) => (
  <EditorContent
    editor={useEditor({
      content: value as Content,
      editorProps: { attributes: { class: twMerge('prose input', className) } },
      extensions: [
        Bold,
        BulletList,
        Document,
        History,
        Italic,
        Link.configure({
          HTMLAttributes: {
            target: '_blank',
          },
        }),
        ListItem,
        OrderedList,
        Paragraph,
        Text,
      ],
      injectCSS: false,
      onUpdate: ({ editor }) => {
        if (!onChange) return;

        onChange({
          target: { name, value: editor.getHTML() },
        } as ChangeEvent<HTMLTextAreaElement>);
      },
    })}
    name={name}
    ref={() => ref}
  />
));

RichTextarea.displayName = 'RichTextarea';

export default RichTextarea;
