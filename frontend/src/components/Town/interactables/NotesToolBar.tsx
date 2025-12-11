import React from 'react';
import { HStack, Button, Select, Box } from '@chakra-ui/react';
import { Editor } from '@tiptap/react';

type ToolBarProps = {
  editor: Editor | null;
};

export default function NotesToolbar({ editor }: ToolBarProps) {
  if (!editor) return null;

  return (
    <HStack spacing={2} mb={2}>
      <Select
        width='100px'
        placeholder='Arial'
        onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}>
        <option value='Georgia'>Georgia</option>
        <option value='Times New Roman'>Times New Roman</option>
        <option value='Courier New'>Courier New</option>
      </Select>

      <Button size='sm' variant='ghost' position='relative'>
        <Box position='relative' pointerEvents='none'>
          A
          <Box
            position='absolute'
            bottom='-2px'
            left='0'
            right='0'
            height='3px'
            bg={editor.getAttributes('textStyle').color || '#000000'}
          />
        </Box>

        <input
          type='color'
          value={editor.getAttributes('textStyle').color || '#000000'}
          onChange={e => editor?.chain().focus().setColor(e.target.value).run()}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            border: 'none',
            padding: 0,
            margin: 0,
          }}
        />
      </Button>

      <Button size='sm' data-testid='toolbar-bold' onClick={() => editor.chain().focus().toggleBold().run()}>
        <b>B</b>
      </Button>

      <Button size='sm' data-testid='toolbar-italic' onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </Button>

      <Button size='sm' data-testid='toolbar-underline' onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <u>U</u>
      </Button>

      <Button size='sm' data-testid='toolbar-strike' onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </Button>

      <Button size='sm' data-testid='toolbar-taskList' onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <p>[ ]</p>
      </Button>

      <Button size='sm' data-testid='toolbar-bulletList' onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <b>•</b>
      </Button>

      <Button size='sm' data-testid='toolbar-orderedList' onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <p>1.</p>
      </Button>
    </HStack>
  );
}
