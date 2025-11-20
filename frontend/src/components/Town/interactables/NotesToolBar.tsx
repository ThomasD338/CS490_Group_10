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

      <Button size='sm' onClick={() => editor.chain().focus().toggleBold().run()}>
        <b>B</b>
      </Button>

      <Button size='sm' onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </Button>

      <Button size='sm' onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <u>U</u>
      </Button>

      <Button size='sm' onClick={() => editor.chain().focus().toggleStrike().run()}>
        <s>S</s>
      </Button>
    </HStack>
  );
}
