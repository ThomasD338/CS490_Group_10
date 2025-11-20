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
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyleKit } from '@tiptap/extension-text-style';
import NotesToolbar from './NotesToolBar';
import { useInteractable } from '../../../classes/TownController';
import { NoteTakingArea } from '../../../types/CoveyTownSocket';
import useTownController from '../../../hooks/useTownController';
import NoteTakingAreaInteractable from './NoteTakingArea';
import NoteTakingAreaController, {
  useNoteTakingAreaNotes,
} from '../../../classes/interactable/NoteTakingAreaController';

/**
 * NotesBoard component - A text editor using Tiptap for note-taking
 */
function NotesBoard({
  noteTakingAreaController,
  onExport,
  onImport,
}: {
  noteTakingAreaController: NoteTakingAreaController;
  onExport: () => void;
  onImport: () => void;
}): JSX.Element {
  const currentNotes = useNoteTakingAreaNotes(noteTakingAreaController);

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyleKit],
    content: currentNotes,
    immediatelyRender: false,
    onDestroy: () => {
      // Save notes back to the backend when editor is destroyed
      if (editor) {
        noteTakingAreaController.updateNotes(editor.getHTML());
      }
      console.log('Editor destroyed, notes saved to backend!');
    },
    onUpdate: () => {
      // Save notes back to the backend on every update
      if (editor) {
        noteTakingAreaController.updateNotes(editor.getHTML());
      }
      console.log('Editor updated, notes saved to backend!');
    },
  });

  // Update editor content when notes change externally
  useEffect(() => {
    if (editor && currentNotes !== undefined) {
      console.log('updating editor content from notes:');
      console.log(currentNotes);
      if (editor.getHTML() !== currentNotes) {
        editor.commands.setContent(currentNotes);
      }
    }
  }, [editor, currentNotes]);

  // Expose editor to parent for export
  useEffect(() => {
    if (editor) {
      // Store editor reference on window temporarily for button handlers
      (window as any).__notesBoardEditor = editor;
    }
    return () => {
      delete (window as any).__notesBoardEditor;
    };
  }, [editor]);

  return (
    <Box width='100%' height='100%'>
      <Box
        border='1px'
        borderColor='gray.300'
        borderRadius='md'
        p={4}
        minHeight='400px'
        mb={4}
        bg='white'>
        {editor && <NotesToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </Box>
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
    // TODO: Implement export functionality
    const editor = (window as any).__notesBoardEditor;
    if (editor) {
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
      toast({
        title: 'Notes exported successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      console.log('Export button clicked - Nothing happened!');
      // Future: Could trigger file download here
    }
  }, []);

  const handleImport = useCallback(() => {
    // TODO: Implement import functionality
    console.log('Import button clicked');
    // Future: Could open file picker here
  }, []);

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
