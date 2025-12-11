import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import React from 'react';
import NotesToolbar from './NotesToolBar';
import { render, screen } from '@testing-library/react';
import TownController from '../../../classes/TownController';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { NotesBoard } from './NotesBoard';
import NoteTakingAreaController, { NoteTakingAreaEvents } from '../../../classes/interactable/NoteTakingAreaController';

describe('Text formatting', () => {
    let testArea: NoteTakingAreaController;
    const mockListeners = mock<NoteTakingAreaEvents>();
    const mockTownController = mock<TownController>();
    const user = userEvent.setup();
    beforeEach(() => {
        testArea = new NoteTakingAreaController(nanoid(), 'New Note', mockTownController);
        testArea.addListener('notesChange', mockListeners.notesChange);
        render(<NotesBoard noteTakingAreaController={testArea} />);
    });
    it('clicking list button should add a list tag', async () => {
        const editor = await (window as any).__editor;
        await user.click(screen.getByTestId('toolbar-taskList'));
        expect(editor.getHTML()).toContain('</li>');
    });
    it('clicking list button twice should do nothing', async () => {
        const editor = await (window as any).__editor;
        fireEvent.click(screen.getByTestId('toolbar-taskList'))
        fireEvent.click(screen.getByTestId('toolbar-taskList'))
        expect(editor.getHTML()).toContain('<p>New Note</p>');
    });
    it('should bold text after clicking bold button', async () => {
        const editor = await (window as any).__editor;
        fireEvent.click(screen.getByTestId('toolbar-bold'))
        editor.commands.insertContent('boldText');
        expect(editor.getHTML()).toBe('<p>New Note<strong>boldText</strong></p>');
    });
});
