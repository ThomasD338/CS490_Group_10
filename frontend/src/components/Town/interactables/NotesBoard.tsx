import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Box,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  IconButton,
  Input,
} from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyleKit } from '@tiptap/extension-text-style';
import NotesToolbar from './NotesToolBar';
import { ListKit } from '@tiptap/extension-list';
import { useInteractable } from '../../../classes/TownController';
import { NoteTakingArea, Note } from '../../../types/CoveyTownSocket';
import useTownController from '../../../hooks/useTownController';
import NoteTakingAreaInteractable from './NoteTakingArea';
import NoteTakingAreaController, {
  useNoteTakingAreaNotes,
} from '../../../classes/interactable/NoteTakingAreaController';
import { debounce } from 'lodash';
import JSZip from 'jszip';

const createNewNote = (id: string, title: string, content = '<p>New Note</p>'): Note => ({
  id,
  title,
  content,
});

/**
 * NotesBoard component - A text editor using Tiptap for note-taking
 */
function NotesBoard({
  noteTakingAreaController,
}: {
  noteTakingAreaController: NoteTakingAreaController;
  onExport: (content: string) => void;
  onImport: (content: string) => void;
}): JSX.Element {
  // remoteNotes is now Note[]
  const remoteNotes = useNoteTakingAreaNotes(noteTakingAreaController);

  // We manage notes locally to support real-time editing before debouncing,
  // and we manage which tab is active.
  const [notes, setNotes] = useState<Note[]>(remoteNotes);
  const [activeNoteIndex, setActiveNoteIndex] = useState(0);

  // Sync notes from controller (remote) to local state
  useEffect(() => {
    // Only update if remote notes are different from current local notes array reference
    if (remoteNotes !== notes) {
      setNotes(remoteNotes);
    }
    // Ensure active index is valid
    if (activeNoteIndex >= remoteNotes.length) {
      setActiveNoteIndex(Math.max(0, remoteNotes.length - 1));
    }
  }, [remoteNotes, activeNoteIndex]);

  const debouncedSaveNotes = useCallback(
    debounce((notesToSave: Note[]) => {
      // Only save if the noteTakingAreaController is defined (which it is here)
      noteTakingAreaController.updateNotes(notesToSave);
    }, 150), // Increased debounce time for array updates
    [noteTakingAreaController],
  );

  // Handle note updates locally and debounce the save to the controller
  const handleUpdateNotes = useCallback(
    (updatedNotes: Note[]) => {
      setNotes(updatedNotes);
      debouncedSaveNotes(updatedNotes);
    },
    [debouncedSaveNotes],
  );

  const activeNote = notes[activeNoteIndex];

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyleKit, ListKit],
    content: activeNote?.content || '', // Use content of active note
    immediatelyRender: false,
    onDestroy: () => {
      // Cleanup: Attempt to save latest state on destroy
      debouncedSaveNotes.cancel(); // Cancel any pending debounce
      if (notes) {
        noteTakingAreaController.updateNotes(notes);
      }
      console.log('Editor destroyed, notes saved to backend!');
    },
    onUpdate: ({ editor: updatedEditor }) => {
      if (activeNote) {
        const newContent = updatedEditor.getHTML();
        // Check if content actually changed before propagating state update and debounce
        if (newContent !== activeNote.content) {
          const updatedNotes = notes.map((note, idx) =>
            idx === activeNoteIndex ? { ...note, content: newContent } : note,
          );
          handleUpdateNotes(updatedNotes);
        }
      }
    },
  });

  // Effect to handle content synchronization when active note changes (tab switch)
  useEffect(() => {
    if (editor && activeNote) {
      // If the editor content doesn't match the note content, update the editor
      if (editor.getHTML() !== activeNote.content) {
        // Set content without emitting an update event
        editor.commands.setContent(activeNote.content, { emitUpdate: false });
      }
    }
  }, [editor, activeNote]);

  // Expose editor content (of active note) to parent for export/import
  useEffect(() => {
    if (activeNote) {
      // Store active note content reference on window temporarily for button handlers
      (window as any).__notesBoardEditorContent = activeNote.content;
      (window as any).__notesBoardEditorTitle = activeNote.title;
      (window as any).__notesBoardEditorSetContentAndTitle = (
        newContent: string,
        newTitle?: string,
      ) => {
        if (activeNote) {
          const updatedNotes = notes.map((note, idx) =>
            idx === activeNoteIndex
              ? { ...note, content: newContent, title: newTitle || note.title }
              : note,
          );
          handleUpdateNotes(updatedNotes);
          // Manually update Tiptap editor if it's currently showing the tab that got imported data
          if (editor) {
            editor.commands.setContent(newContent, { emitUpdate: false });
          }
        }
      };
    } else {
      delete (window as any).__notesBoardEditorContent;
      delete (window as any).__notesBoardEditorTitle;
      delete (window as any).__notesBoardEditorSetContentAndTitle;
    }
    return () => {
      delete (window as any).__notesBoardEditorContent;
      delete (window as any).__notesBoardEditorTitle;
      delete (window as any).__notesBoardEditorSetContentAndTitle;
    };
  }, [activeNote, notes, activeNoteIndex, handleUpdateNotes, editor]);

  // Tab management functions
  const handleAddTab = useCallback(() => {
    // Generate simple sequential ID. In a real application, use UUID.
    const newId = `note-${Date.now()}`;
    const newNote = createNewNote(newId, `Untitled Note ${notes.length + 1}`);
    const updatedNotes = [...notes, newNote];
    handleUpdateNotes(updatedNotes);
    setActiveNoteIndex(updatedNotes.length - 1); // Switch to the new tab
  }, [notes, handleUpdateNotes]);

  const handleCloseTab = useCallback(
    (indexToClose: number) => {
      const newNotes = notes.filter((_, idx) => idx !== indexToClose);
      if (newNotes.length === 0) {
        // Must always have at least one note
        handleAddTab();
        return;
      }

      // Adjust active index
      let newActiveIndex = activeNoteIndex;
      if (indexToClose === activeNoteIndex) {
        // If closing the active tab, move to the previous one, or 0 if it was the first
        newActiveIndex = Math.max(0, indexToClose - 1);
      } else if (indexToClose < activeNoteIndex) {
        // If closing a tab before the active one, shift the active index left
        newActiveIndex = activeNoteIndex - 1;
      }
      handleUpdateNotes(newNotes);
      setActiveNoteIndex(newActiveIndex);
    },
    [notes, activeNoteIndex, handleUpdateNotes, handleAddTab],
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      const updatedNotes = notes.map((note, idx) =>
        idx === activeNoteIndex ? { ...note, title: newTitle } : note,
      );
      handleUpdateNotes(updatedNotes);
    },
    [notes, activeNoteIndex, handleUpdateNotes],
  );

  if (!activeNote) {
    return <></>;
  }

  return (
    <Box width='100%' height='100%'>
      <style>
        {`

        .editable .ProseMirror {
          min-height: 400px;
          padding: 8px;
        }
        }

        .editable .ProseMirror:after {
          content: "";
          display: block;
          height: 250px;
        }
      `}
      </style>
      {/* <Box
        border='1px'
        borderColor='gray.300'
        borderRadius='md'
        p={0}
        minHeight='400px'
        mb={4}
        bg='white'>
        {editor && <NotesToolbar editor={editor} />}
        <EditorContent editor={editor} className="editable"/>
      </Box> */}
      <Tabs
        index={activeNoteIndex}
        onChange={setActiveNoteIndex}
        variant='soft-rounded'
        colorScheme='blue'
        isLazy>
        <TabList overflowX='auto' flexWrap='nowrap'>
          {notes.map((note, index) => (
            <Tab key={note.id} p={2} position='relative'>
              <Flex align='center'>
                {note.title}
                {notes.length > 1 && (
                  <IconButton
                    icon={<CloseIcon />}
                    size='xs'
                    variant='ghost'
                    ml={2}
                    aria-label={`Close ${note.title}`}
                    onClick={e => {
                      e.stopPropagation();
                      handleCloseTab(index);
                    }}
                  />
                )}
              </Flex>
            </Tab>
          ))}
          <Button size='sm' onClick={handleAddTab} ml={2} flexShrink={0}>
            + Add Tab
          </Button>
        </TabList>

        <TabPanels>
          {notes.map((note, index) => (
            <TabPanel key={note.id} p={0}>
              <Box
                border='1px'
                borderColor='gray.300'
                borderRadius='md'
                p={4}
                minHeight='400px'
                mt={4}
                mb={4}
                bg='white'>
                <Input
                  value={note.title}
                  onChange={handleTitleChange}
                  mb={3}
                  placeholder='Note Title'
                  fontSize='xl'
                  fontWeight='bold'
                />
                {/* Only render toolbar and editor if this tab is active AND the editor exists */}
                {editor && index === activeNoteIndex && <NotesToolbar editor={editor} />}
                {editor && index === activeNoteIndex && (
                  <EditorContent editor={editor} className='editable' />
                )}
              </Box>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Box>
  );
}

/**
 * Internal component that has access to the controller for zip operations
 */
function NotesBoardModal({
  noteTakingAreaController,
  noteTakingAreaInteractable,
  townController,
}: {
  noteTakingAreaController: NoteTakingAreaController;
  noteTakingAreaInteractable: NoteTakingAreaInteractable;
  townController: ReturnType<typeof useTownController>;
}): JSX.Element {
  // Get all notes for zip export/import - hook can be called unconditionally here
  const allNotes = useNoteTakingAreaNotes(noteTakingAreaController);

  const closeModal = useCallback(() => {
    townController.interactEnd(noteTakingAreaInteractable);
  }, [townController, noteTakingAreaInteractable]);

  const toast = useToast();

  // Original single-note export handler (for active note only)
  const handleExport = useCallback(() => {
    const content = (window as any).__notesBoardEditorContent;
    const title: string | undefined = (window as any).__notesBoardEditorTitle;
    if (content) {
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const downloadFileName = title ? `${title}.html` : 'notes.html';
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: 'Notes exported successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      console.log('Export button clicked - No active note content found!');
    }
  }, [toast]);

  // Original single-note import handler (for active note only)
  const handleImport = useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt, .html';

    fileInput.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      try {
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          const reader = new FileReader();

          // Get the filename without extension to use as the new note title
          const fileName = file.name.replace(/\.[^/.]+$/, '');

          reader.onload = loadEvent => {
            const text = loadEvent.target?.result;
            if (typeof text === 'string') {
              const setContentAndTitle = (window as any).__notesBoardEditorSetContentAndTitle;
              if (setContentAndTitle) {
                // Use the exposed function to set content and update the title
                setContentAndTitle(text, fileName);
                toast({
                  title: `Notes imported successfully into tab: ${fileName}`,
                  status: 'success',
                  duration: 3000,
                  isClosable: true,
                });
              }
            }
          };
          reader.readAsText(file);
        }
      } finally {
        // Ensure file input is removed after use, even if errors occur
        if (document.body.contains(fileInput)) {
          document.body.removeChild(fileInput);
        }
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    console.log('Import button clicked');
  }, [toast]);

  // New zip export handler (exports all notes)
  const handleZipExport = useCallback(async () => {
    if (!noteTakingAreaController || allNotes.length === 0) {
      toast({
        title: 'No notes to export',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const zip = new JSZip();

      // Track title counts to handle duplicates
      const titleCounts = new Map<string, number>();

      // First pass: count occurrences of each sanitized title
      allNotes.forEach(note => {
        const sanitizedTitle = note.title
          .replace(/[<>:"/\\|?*]/g, '_')
          .trim();
        const count = titleCounts.get(sanitizedTitle) || 0;
        titleCounts.set(sanitizedTitle, count + 1);
      });

      // Track how many times we've used each title
      const titleUsageCounts = new Map<string, number>();

      // Add each note as an HTML file
      allNotes.forEach(note => {
        // Sanitize filename: remove invalid characters
        let sanitizedTitle = note.title
          .replace(/[<>:"/\\|?*]/g, '_')
          .trim();
        
        // Handle empty or whitespace-only titles
        if (!sanitizedTitle) {
          sanitizedTitle = 'Untitled';
        }

        // If there are duplicates of this title, add a number suffix
        const totalCount = titleCounts.get(sanitizedTitle) || 1;
        let filename: string;
        
        if (totalCount > 1) {
          // This title appears multiple times, add a counter
          const usageCount = (titleUsageCounts.get(sanitizedTitle) || 0) + 1;
          titleUsageCounts.set(sanitizedTitle, usageCount);
          
          if (usageCount === 1) {
            // First occurrence, use the original title
            filename = `${sanitizedTitle}.html`;
          } else {
            // Subsequent occurrences, add a number
            filename = `${sanitizedTitle} ${usageCount}.html`;
          }
        } else {
          // Unique title, use as-is
          filename = `${sanitizedTitle}.html`;
        }

        // Export as HTML file with the note content
        zip.file(filename, note.content);
      });

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Create a readable datetime string for the filename
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const datetimeString = `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
      
      link.download = `notes-export-${datetimeString}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: `Exported ${allNotes.length} note(s) to zip successfully!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error exporting notes to zip:', error);
      toast({
        title: 'Failed to export notes',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [noteTakingAreaController, allNotes, toast]);

  // New zip import handler (imports all notes from zip)
  const handleZipImport = useCallback(() => {
    if (!noteTakingAreaController) {
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.zip';

    fileInput.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      try {
        if (target.files && target.files.length > 0) {
          const file = target.files[0];

          if (!file.name.endsWith('.zip')) {
            toast({
              title: 'Invalid file type',
              description: 'Please select a .zip file',
              status: 'error',
              duration: 3000,
              isClosable: true,
            });
            return;
          }

          const zip = new JSZip();
          const zipData = await zip.loadAsync(file);

          // Process all HTML files in the zip
          const htmlFilePromises = Object.keys(zipData.files).map(async filename => {
            const zipFile = zipData.files[filename];
            // Skip directories
            if (zipFile.dir) {
              return null;
            }

            // Only process HTML files
            if (!filename.endsWith('.html')) {
              return null;
            }

            try {
              const htmlContent = await zipFile.async('string');
              
              // Extract title from filename (remove .html extension)
              // Keep any numbers in the title (e.g., "Note 2" stays as "Note 2")
              let title = filename.replace(/\.html$/, '').trim();
              
              // Handle empty titles
              if (!title) {
                title = 'Untitled';
              }

              // Create a note object from the HTML file
              const note: Note = {
                id: `note-${Date.now()}-${Math.random().toString(36).substring(7)}`, // Generate new ID
                title: title,
                content: htmlContent,
              };

              return note;
            } catch (parseError) {
              console.error(`Error reading HTML file ${filename}:`, parseError);
              return null;
            }
          });

          const notes = await Promise.all(htmlFilePromises);
          const validNotes = notes.filter((note): note is Note => note !== null);

          if (validNotes.length === 0) {
            toast({
              title: 'No valid notes found',
              description: 'The zip file does not contain any valid HTML files',
              status: 'warning',
              duration: 3000,
              isClosable: true,
            });
            return;
          }

          // Merge imported notes with existing notes
          // Ensure all imported notes have unique IDs
          const currentNoteIds = new Set(allNotes.map(n => n.id));
          const notesWithNewIds = validNotes.map((note, index) => {
            let newId = note.id;
            // If ID conflicts, generate a new one with a unique timestamp offset
            if (currentNoteIds.has(newId)) {
              newId = `note-${Date.now() + index}-${Math.random().toString(36).substring(7)}`;
            }
            currentNoteIds.add(newId);
            return { ...note, id: newId };
          });

          // Update the controller with merged notes
          const mergedNotes = [...allNotes, ...notesWithNewIds];
          await noteTakingAreaController.updateNotes(mergedNotes);

          toast({
            title: `Imported ${notesWithNewIds.length} note(s) from zip successfully!`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        }
      } catch (error) {
        console.error('Error importing notes from zip:', error);
        toast({
          title: 'Failed to import notes',
          description: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        // Ensure file input is removed after use, even if errors occur
        if (document.body.contains(fileInput)) {
          document.body.removeChild(fileInput);
        }
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
  }, [noteTakingAreaController, allNotes, toast]);

  const areaName = noteTakingAreaInteractable.name;

  return (
    <Modal isOpen={true} onClose={closeModal} closeOnOverlayClick={false} size='xl'>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Notes Board - {areaName}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <NotesBoard
            noteTakingAreaController={noteTakingAreaController}
            onExport={handleExport}
            onImport={handleImport}
          />
        </ModalBody>
        <ModalFooter>
          <Button colorScheme='blue' onClick={handleExport} mr={3}>
            Export Notes
          </Button>
          <Button colorScheme='green' onClick={handleImport} mr={3}>
            Import Notes
          </Button>
          <Button colorScheme='purple' onClick={handleZipExport} mr={3}>
            Export All (ZIP)
          </Button>
          <Button colorScheme='orange' onClick={handleZipImport}>
            Import All (ZIP)
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/**
 * NotesBoardWrapper - Always rendered component that shows NotesBoard modal when player interacts with NoteTakingArea
 */
export default function NotesBoardWrapper(): JSX.Element {
  const noteTakingAreaInteractable = useInteractable<NoteTakingAreaInteractable>('noteTakingArea');
  const townController = useTownController();
  const noteTakingAreaController = noteTakingAreaInteractable?.controller;

  // Create placeholder model from the interactable
  useEffect(() => {
    if (noteTakingAreaInteractable) {
      townController.pause();
    } else {
      townController.unPause();
    }
  }, [townController, noteTakingAreaInteractable]);

  if (!noteTakingAreaController || !noteTakingAreaInteractable) {
    return <></>;
  }

  return (
    <NotesBoardModal
      noteTakingAreaController={noteTakingAreaController}
      noteTakingAreaInteractable={noteTakingAreaInteractable}
      townController={townController}
    />
  );
}
