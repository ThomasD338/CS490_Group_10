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
import { ListKit } from '@tiptap/extension-list'
import { useInteractable } from '../../../classes/TownController';
import { NoteTakingArea, Note } from '../../../types/CoveyTownSocket';
import useTownController from '../../../hooks/useTownController';
import NoteTakingAreaInteractable from './NoteTakingArea';
import NoteTakingAreaController, {
  useNoteTakingAreaNotes,
} from '../../../classes/interactable/NoteTakingAreaController';
import { debounce } from 'lodash';

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
  onExport,
  onImport,
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
      (window as any).__notesBoardEditorSetContent = (newContent: string) => {
        if (activeNote) {
          const updatedNotes = notes.map((note, idx) =>
            idx === activeNoteIndex ? { ...note, content: newContent } : note,
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
      delete (window as any).__notesBoardEditorSetContent;
    }
    return () => {
      delete (window as any).__notesBoardEditorContent;
      delete (window as any).__notesBoardEditorTitle;
      delete (window as any).__notesBoardEditorSetContent;
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
                {editor && index === activeNoteIndex && <EditorContent editor={editor} className="editable"/>}
              </Box>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Box>
  );

}

/**
 * NotesBoardWrapper - Always rendered component that shows NotesBoard modal when player interacts with NoteTakingArea
 */
export default function NotesBoardWrapper(): JSX.Element {
  const noteTakingAreaInteractable = useInteractable<NoteTakingAreaInteractable>('noteTakingArea');
  const townController = useTownController();
  const isOpen = noteTakingAreaInteractable !== undefined;
  const noteTakingAreaController = noteTakingAreaInteractable?.controller;

  // Create placeholder model from the interactable
  useEffect(() => {
    if (noteTakingAreaInteractable) {
      // For now, create a placeholder model since NoteTakingArea might not have a controller yet
      // This can be enhanced later when full backend integration is complete
      // const placeholderModel: NoteTakingArea = {
      //   id: noteTakingAreaInteractable.id,
      //   type: 'NoteTakingArea',
      //   notes: noteTakingAreaInteractable.notes,
      //   occupants: [],
      // };
      // setNoteTakingAreaModel(placeholderModel);
      townController.pause();
    } else {
      //setNoteTakingAreaModel(undefined);
      townController.unPause();
    }
  }, [townController, noteTakingAreaInteractable]);

  const closeModal = useCallback(() => {
    if (noteTakingAreaInteractable) {
      townController.interactEnd(noteTakingAreaInteractable);
    }
  }, [townController, noteTakingAreaInteractable]);

  const toast = useToast();

  const handleExport = useCallback(() => {
    const content = (window as any).__notesBoardEditorContent;
    const title: string | undefined = (window as any).__notesBoardEditorTitle;
    if (content) {
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const downloadFileName = title
        ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`
        : 'notes.html';
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
          reader.onload = loadEvent => {
            const text = loadEvent.target?.result;
            if (typeof text === 'string') {
              const setContent = (window as any).__notesBoardEditorSetContent;
              if (setContent) {
                setContent(text); // Use the exposed setContent function
                toast({
                  title: 'Notes imported successfully!',
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

  if (!noteTakingAreaController) {
    return <></>;
  }
  const areaName = noteTakingAreaInteractable.name;

  return (
    <Modal isOpen={isOpen} onClose={closeModal} closeOnOverlayClick={false} size='xl'>
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
          <Button colorScheme='green' onClick={handleImport}>
            Import Notes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
