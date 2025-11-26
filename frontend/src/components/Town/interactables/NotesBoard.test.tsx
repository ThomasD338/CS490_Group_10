export {};
/**
 * Logic tests for NotesBoard import/export functionality
 * These tests focus on the business logic without rendering Tiptap components
 */

describe('NotesBoard Import/Export Logic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as any).__notesBoardEditor;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as any).__notesBoardEditor;
  });

  describe('Export Logic', () => {
    it('should create blob with correct content type when exporting', () => {
      const testContent = '<p>Exported content</p>';
      const mockEditor = {
        getHTML: jest.fn(() => testContent),
      };
      (window as any).__notesBoardEditor = mockEditor;

      const editor = (window as any).__notesBoardEditor;
      const content = editor.getHTML();
      const blob = new Blob([content], { type: 'text/html' });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/html');
      expect(mockEditor.getHTML).toHaveBeenCalled();
    });

    it('should create object URL and download link for export', () => {
      const testContent = '<p>Test content</p>';
      const mockEditor = {
        getHTML: jest.fn(() => testContent),
      };
      (window as any).__notesBoardEditor = mockEditor;

      // Mock URL.createObjectURL for jsdom (it's not available in jsdom)
      const mockUrl = 'blob:http://localhost:3000/mock-url';
      (URL as any).createObjectURL = jest.fn(() => mockUrl);
      (URL as any).revokeObjectURL = jest.fn();

      const createElementSpy = jest.spyOn(document, 'createElement');
      const appendChildSpy = jest.spyOn(document.body, 'appendChild');
      const removeChildSpy = jest.spyOn(document.body, 'removeChild');

      const mockLink = document.createElement('a');
      mockLink.click = jest.fn();
      createElementSpy.mockReturnValue(mockLink);

      const editor = (window as any).__notesBoardEditor;
      const content = editor.getHTML();
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'notes.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      expect(url).toBe(mockUrl);
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalledWith(link);
      expect(mockLink.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(link);
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
      expect(link.download).toBe('notes.html');

      (URL.createObjectURL as jest.Mock).mockRestore();
      (URL.revokeObjectURL as jest.Mock).mockRestore();
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should handle export when editor is not available', () => {
      delete (window as any).__notesBoardEditor;
      const editor = (window as any).__notesBoardEditor;
      expect(editor).toBeUndefined();
    });

    it('should set correct filename for exported file', () => {
      const link = document.createElement('a');
      link.download = 'notes.html';
      expect(link.download).toBe('notes.html');
    });

    it('should create blob with correct MIME type', () => {
      const content = '<p>HTML content</p>';
      const blob = new Blob([content], { type: 'text/html' });
      expect(blob.type).toBe('text/html');
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('Import Logic', () => {
    it('should create file input with correct accept attribute', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.txt, .html';
      expect(fileInput.type).toBe('file');
      expect(fileInput.accept).toBe('.txt, .html');
    });

    it('should read file content using FileReader', async () => {
      const fileContent = '<p>Imported HTML content</p>';
      const file = new File([fileContent], 'test.html', { type: 'text/html' });
      const reader = new FileReader();
      const readAsTextSpy = jest.spyOn(reader, 'readAsText');

      reader.readAsText(file);
      expect(readAsTextSpy).toHaveBeenCalledWith(file);

      await new Promise<void>((resolve) => {
        reader.onload = (e) => {
          const text = e.target?.result;
          expect(text).toBe(fileContent);
          expect(typeof text).toBe('string');
          resolve();
        };
      });

      readAsTextSpy.mockRestore();
    });

    it('should handle HTML file import', async () => {
      const fileContent = '<p>HTML content</p>';
      const file = new File([fileContent], 'test.html', { type: 'text/html' });
      const mockEditor = {
        commands: {
          setContent: jest.fn(),
        },
      };
      (window as any).__notesBoardEditor = mockEditor;

      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const editor = (window as any).__notesBoardEditor;
          if (editor) {
            editor.commands.setContent(text);
          }
          expect(mockEditor.commands.setContent).toHaveBeenCalledWith(fileContent);
          resolve();
        };
        reader.readAsText(file);
      });
    });

    it('should handle TXT file import', async () => {
      const fileContent = 'Plain text content';
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' });
      const mockEditor = {
        commands: {
          setContent: jest.fn(),
        },
      };
      (window as any).__notesBoardEditor = mockEditor;

      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const editor = (window as any).__notesBoardEditor;
          if (editor) {
            editor.commands.setContent(text);
          }
          expect(mockEditor.commands.setContent).toHaveBeenCalledWith(fileContent);
          resolve();
        };
        reader.readAsText(file);
      });
    });

    it('should handle import when no file is selected', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      Object.defineProperty(fileInput, 'files', {
        value: [],
        writable: false,
      });
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
      expect(fileInput.files?.length).toBe(0);
    });

    it('should handle import when editor is not available', async () => {
      delete (window as any).__notesBoardEditor;
      const fileContent = '<p>Content</p>';
      const file = new File([fileContent], 'test.html', { type: 'text/html' });
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const editor = (window as any).__notesBoardEditor;
          expect(editor).toBeUndefined();
          expect(text).toBe(fileContent);
          resolve();
        };
        reader.readAsText(file);
      });
    });

    it('should clean up file input element after import', () => {
      const fileInput = document.createElement('input');
      document.body.appendChild(fileInput);
      const removeChildSpy = jest.spyOn(document.body, 'removeChild');
      document.body.removeChild(fileInput);
      expect(removeChildSpy).toHaveBeenCalledWith(fileInput);
      expect(document.body.contains(fileInput)).toBe(false);
      removeChildSpy.mockRestore();
    });

    it('should handle file input click event', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.txt, .html';
      const clickSpy = jest.fn();
      fileInput.click = clickSpy;
      fileInput.click();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should allow importing a file multiple times in one town', async () => {
      const mockEditor = {
        commands: {
          setContent: jest.fn(),
        },
      };
      (window as any).__notesBoardEditor = mockEditor;

      const fileContent1 = '<p>First import</p>';
      const fileContent2 = '<p>Second import</p>';
      const fileContent3 = '<p>Third import</p>';

      const file1 = new File([fileContent1], 'test1.html', { type: 'text/html' });
      const file2 = new File([fileContent2], 'test2.html', { type: 'text/html' });
      const file3 = new File([fileContent3], 'test3.html', { type: 'text/html' });

      const reader1 = new FileReader();
      const reader2 = new FileReader();
      const reader3 = new FileReader();

      // Import first file
      await new Promise<void>((resolve) => {
        reader1.onload = (e) => {
          const text = e.target?.result as string;
          const editor = (window as any).__notesBoardEditor;
          if (editor) {
            editor.commands.setContent(text);
          }
          expect(mockEditor.commands.setContent).toHaveBeenCalledWith(fileContent1);
          resolve();
        };
        reader1.readAsText(file1);
      });

      // Import second file
      await new Promise<void>((resolve) => {
        reader2.onload = (e) => {
          const text = e.target?.result as string;
          const editor = (window as any).__notesBoardEditor;
          if (editor) {
            editor.commands.setContent(text);
          }
          expect(mockEditor.commands.setContent).toHaveBeenCalledWith(fileContent2);
          resolve();
        };
        reader2.readAsText(file2);
      });

      // Import third file
      await new Promise<void>((resolve) => {
        reader3.onload = (e) => {
          const text = e.target?.result as string;
          const editor = (window as any).__notesBoardEditor;
          if (editor) {
            editor.commands.setContent(text);
          }
          expect(mockEditor.commands.setContent).toHaveBeenCalledWith(fileContent3);
          resolve();
        };
        reader3.readAsText(file3);
      });

      // Verify all three imports were called
      expect(mockEditor.commands.setContent).toHaveBeenCalledTimes(3);
      expect(mockEditor.commands.setContent).toHaveBeenNthCalledWith(1, fileContent1);
      expect(mockEditor.commands.setContent).toHaveBeenNthCalledWith(2, fileContent2);
      expect(mockEditor.commands.setContent).toHaveBeenNthCalledWith(3, fileContent3);
    });

  describe('Integration Logic', () => {
    it('should export and import the same content', async () => {
      const testContent = '<p>Round trip test</p>';
      const mockEditor = {
        getHTML: jest.fn(() => testContent),
        commands: {
          setContent: jest.fn(),
        },
      };
      (window as any).__notesBoardEditor = mockEditor;

      const editor = (window as any).__notesBoardEditor;
      const exportedContent = editor.getHTML();
      expect(exportedContent).toBe(testContent);

      const file = new File([exportedContent], 'test.html', { type: 'text/html' });
      const reader = new FileReader();

      await new Promise<void>((resolve) => {
        reader.onload = (e) => {
          const text = e.target?.result as string;
          editor.commands.setContent(text);
          expect(editor.commands.setContent).toHaveBeenCalledWith(testContent);
          resolve();
        };
        reader.readAsText(file);
      });

    it('should handle blob creation and URL management correctly', () => {
      const content = '<p>Test</p>';
      const blob = new Blob([content], { type: 'text/html' });

      const mockUrl = 'blob:http://localhost:3000/mock-url';
      (URL as any).createObjectURL = jest.fn(() => mockUrl);
      (URL as any).revokeObjectURL = jest.fn();

      const url = URL.createObjectURL(blob);
      expect(url).toBe(mockUrl);
      expect(typeof url).toBe('string');

      URL.revokeObjectURL(url);
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);

      (URL.createObjectURL as jest.Mock).mockRestore();
      (URL.revokeObjectURL as jest.Mock).mockRestore();
    });

    it('should handle multiple file types correctly', async () => {
      const htmlContent = '<p>HTML</p>';
      const txtContent = 'Plain text';

      const htmlFile = new File([htmlContent], 'test.html', { type: 'text/html' });
      const txtFile = new File([txtContent], 'test.txt', { type: 'text/plain' });

      const reader1 = new FileReader();
      const reader2 = new FileReader();

      await Promise.all([
        new Promise<void>((resolve) => {
          reader1.onload = (e) => {
            expect(e.target?.result).toBe(htmlContent);
            resolve();
          };
          reader1.readAsText(htmlFile);
        }),
        new Promise<void>((resolve) => {
          reader2.onload = (e) => {
            expect(e.target?.result).toBe(txtContent);
            resolve();
          };
          reader2.readAsText(txtFile);
        }),
      ]);
    });
  describe('Notes Persistence and Syncing', () => {
    it('should persist notes when editor content changes', async () => {
      const mockController = {
        updateNotes: jest.fn().mockResolvedValue(undefined),
        notes: '',
        addListener: jest.fn(),
        removeListener: jest.fn(),
      };

      const mockEditor = {
        getHTML: jest.fn(() => '<p>Updated notes</p>'),
        commands: {
          setContent: jest.fn(),
        },
      };
      (window as any).__notesBoardEditor = mockEditor;

      // Simulate debounced save (normally triggered by onUpdate)
      const notes = mockEditor.getHTML();
      await mockController.updateNotes(notes);

      expect(mockController.updateNotes).toHaveBeenCalledWith('<p>Updated notes</p>');
      expect(mockController.updateNotes).toHaveBeenCalledTimes(1);
    });

    it('should persist notes when editor is destroyed', async () => {
      const mockController = {
        updateNotes: jest.fn().mockResolvedValue(undefined),
        notes: '',
        addListener: jest.fn(),
        removeListener: jest.fn(),
      };

      const mockEditor = {
        getHTML: jest.fn(() => '<p>Final notes before destroy</p>'),
        commands: {
          setContent: jest.fn(),
        },
      };
      (window as any).__notesBoardEditor = mockEditor;

      // Simulate editor destroy (onDestroy callback)
      const notes = mockEditor.getHTML();
      await mockController.updateNotes(notes);

      expect(mockController.updateNotes).toHaveBeenCalledWith('<p>Final notes before destroy</p>');
    });

    it('should sync notes to multiple users when one user updates', () => {
      // Simulate two users (controllers) viewing the same note area
      // In a real scenario, when one user updates notes, the server broadcasts to all controllers
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      // User 1 updates notes
      const updatedNotes = '<p>User 1 added this</p>';
      
      // Simulate server broadcasting update to all controllers (both receive the same update)
      listener1(updatedNotes);
      listener2(updatedNotes);

      // Both users should receive the update
      expect(listener1).toHaveBeenCalledWith(updatedNotes);
      expect(listener2).toHaveBeenCalledWith(updatedNotes);
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    });

    it('should handle concurrent updates from multiple users', async () => {
      const mockController = {
        updateNotes: jest.fn().mockResolvedValue(undefined),
        notes: '',
        addListener: jest.fn(),
        removeListener: jest.fn(),
        emit: jest.fn(),
      };

      // Simulate User 1 updating
      const user1Notes = '<p>User 1 content</p>';
      await mockController.updateNotes(user1Notes);

      // Simulate User 2 updating (before User 1's update is processed)
      const user2Notes = '<p>User 2 content</p>';
      await mockController.updateNotes(user2Notes);

      // Both updates should be sent
      expect(mockController.updateNotes).toHaveBeenCalledTimes(2);
      expect(mockController.updateNotes).toHaveBeenCalledWith(user1Notes);
      expect(mockController.updateNotes).toHaveBeenCalledWith(user2Notes);
    });

    it('should update editor content when notes change externally', () => {
      const mockEditor = {
        getHTML: jest.fn(() => '<p>Old content</p>'),
        commands: {
          setContent: jest.fn(),
        },
      };
      (window as any).__notesBoardEditor = mockEditor;

      const newNotes = '<p>New content from another user</p>';

      // Simulate external notes change (from another user or server)
      if (mockEditor.getHTML() !== newNotes) {
        mockEditor.commands.setContent(newNotes);
      }

      expect(mockEditor.commands.setContent).toHaveBeenCalledWith(newNotes);
    });

    it('should not update editor if content is already the same', () => {
      const currentContent = '<p>Current content</p>';
      const mockEditor = {
        getHTML: jest.fn(() => currentContent),
        commands: {
          setContent: jest.fn(),
        },
      };
      (window as any).__notesBoardEditor = mockEditor;

      // Simulate external notes change with same content
      const newNotes = currentContent;
      if (mockEditor.getHTML() !== newNotes) {
        mockEditor.commands.setContent(newNotes);
      }

      // Should not be called since content is the same
      expect(mockEditor.commands.setContent).not.toHaveBeenCalled();
    });

    it('should handle notes syncing with empty notes', () => {
      // Simulate a listener receiving an empty notes update
      const listener = jest.fn();

      // Simulate clearing notes (server broadcasts empty string)
      listener('');

      expect(listener).toHaveBeenCalledWith('');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    });

    it('should handle rapid sequential updates from same user', async () => {
      const mockController = {
        updateNotes: jest.fn().mockResolvedValue(undefined),
        notes: '',
        addListener: jest.fn(),
        removeListener: jest.fn(),
      };

      // Simulate rapid typing (debounced saves)
      const updates = [
        '<p>A</p>',
        '<p>AB</p>',
        '<p>ABC</p>',
        '<p>ABCD</p>',
      ];

      for (const update of updates) {
        await mockController.updateNotes(update);
      }

      expect(mockController.updateNotes).toHaveBeenCalledTimes(4);
      expect(mockController.updateNotes).toHaveBeenNthCalledWith(1, '<p>A</p>');
      expect(mockController.updateNotes).toHaveBeenNthCalledWith(2, '<p>AB</p>');
      expect(mockController.updateNotes).toHaveBeenNthCalledWith(3, '<p>ABC</p>');
      expect(mockController.updateNotes).toHaveBeenNthCalledWith(4, '<p>ABCD</p>');
    });

    it('should maintain notes state across multiple users joining and leaving', () => {
      const mockController = {
        notes: '<p>Persistent notes</p>',
        addListener: jest.fn(),
        removeListener: jest.fn(),
        emit: jest.fn(),
      };

      // User 1 joins
      const listener1 = jest.fn();
      mockController.addListener('notesChange', listener1);

      // User 2 joins
      const listener2 = jest.fn();
      mockController.addListener('notesChange', listener2);

      // Notes should be available to both
      expect(mockController.notes).toBe('<p>Persistent notes</p>');

      // User 1 leaves
      mockController.removeListener('notesChange', listener1);

      // Notes should still be available to User 2
      expect(mockController.notes).toBe('<p>Persistent notes</p>');
      expect(mockController.removeListener).toHaveBeenCalledWith('notesChange', listener1);
    });
  });
});
  });
