import React from 'react';

function createMockEditor() {
  const mockEditorElement = typeof document !== 'undefined' 
    ? document.createElement('div')
    : { tagName: 'div' };
  
  return {
    getHTML: jest.fn(() => '<p>Test content</p>'),
    element: mockEditorElement,
    commands: {
      setContent: jest.fn(),
    },
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        setColor: jest.fn(() => ({ run: jest.fn() })),
        setFontFamily: jest.fn(() => ({ run: jest.fn() })),
        toggleBold: jest.fn(() => ({ run: jest.fn() })),
        toggleItalic: jest.fn(() => ({ run: jest.fn() })),
        toggleUnderline: jest.fn(() => ({ run: jest.fn() })),
        toggleStrike: jest.fn(() => ({ run: jest.fn() })),
      })),
    })),
    getAttributes: jest.fn(() => ({ color: '#000000' })),
    view: {
      dom: mockEditorElement,
    },
    destroy: jest.fn(),
    isDestroyed: false,
  };
}

export const useEditor = jest.fn((options) => {
  const editor = createMockEditor();
  (window as any).__notesBoardEditor = editor;
  return editor;
});

export const EditorContent = React.forwardRef((props: any, ref: any) => {
  if (props.editor) {
    (window as any).__notesBoardEditor = props.editor;
  }
  return React.createElement('div', { 
    ref, 
    'data-testid': 'editor-content'
  });
});

EditorContent.displayName = 'EditorContent';
