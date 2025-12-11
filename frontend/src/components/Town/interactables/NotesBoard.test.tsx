import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import React from 'react';
import NotesToolbar from './NotesToolBar';
import { act, render, screen } from '@testing-library/react';
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
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    it('creating new lines', async () => {
        const editor = await (window as any).__editor;
        await act(async () => {
            editor.commands.insertContent('\nline2\nline3\n\nline5');
        });
        expect(editor.getHTML()).toBe('<p>New Note\nline2\nline3\n\nline5</p>');
    });
    it('clicking list button should add a list tag', async () => {
        const editor = await (window as any).__editor;
        await user.click(screen.getByTestId('toolbar-taskList'));
        expect(editor.getHTML()).toContain('</li>');
    });
    it('clicking list button twice should not create a list', async () => {
        const editor = await (window as any).__editor;
        fireEvent.click(screen.getByTestId('toolbar-taskList'))
        fireEvent.click(screen.getByTestId('toolbar-taskList'))
        expect(editor.getHTML()).not.toContain('</li>');
    });
    it('should bold text after clicking bold button', async () => {
        const editor = await (window as any).__editor;
        fireEvent.click(screen.getByTestId('toolbar-bold'))
        await act(async () => {
            editor.commands.insertContent('boldText');
        });
        expect(editor.getHTML()).toBe('<p>New Note<strong>boldText</strong></p>');
    });
});
