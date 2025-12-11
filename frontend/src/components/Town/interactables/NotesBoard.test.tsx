import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import TownController from '../../../classes/TownController';
import userEvent from '@testing-library/user-event';
import { NotesBoard } from './NotesBoard';
import NoteTakingAreaController, { NoteTakingAreaEvents } from '../../../classes/interactable/NoteTakingAreaController';


describe('Text formatting', () => {
    let testArea: NoteTakingAreaController;
    const mockListeners = mock<NoteTakingAreaEvents>();
    const mockTownController = mock<TownController>();
    const user = userEvent.setup();
    beforeEach(() => {
        testArea = new NoteTakingAreaController(nanoid(), '', mockTownController);
        testArea.addListener('notesChange', mockListeners.notesChange);
        render(<NotesBoard noteTakingAreaController={testArea}/>);
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    it('creating new lines', async () => {
        const editor = await (window as any).__editor;
        await act(async () => {
            editor.commands.insertContent('\nline2\nline3\n\nline5');
        });
        expect(editor.getHTML()).toBe('<p>\nline2\nline3\n\nline5</p>');
    });
    it('should bold text after clicking bold button', async () => {
        const editor = await (window as any).__editor;
        fireEvent.click(screen.getByTestId('toolbar-bold'))
        await act(async () => {
            editor.commands.insertContent('boldText');
        });
        expect(editor.getHTML()).toBe('<p><strong>boldText</strong></p>');
    });
    it('alternating between bold and unbold text', async () => {
        const editor = await (window as any).__editor;
        fireEvent.click(screen.getByTestId('toolbar-bold'))
        await act(async () => {
            editor.commands.insertContent('abc');
            fireEvent.click(screen.getByTestId('toolbar-bold'))
            editor.commands.insertContent('def');
            fireEvent.click(screen.getByTestId('toolbar-bold'))
            editor.commands.insertContent('ghi');
        });
        expect(editor.getHTML()).toBe('<p><strong>abc</strong>def<strong>ghi</strong></p>');
    });
    it('alternating between italicized and regular text', async () => {
        const editor = await (window as any).__editor;
        fireEvent.click(screen.getByTestId('toolbar-italic'))
        await act(async () => {
            editor.commands.insertContent('abc');
            fireEvent.click(screen.getByTestId('toolbar-italic'))
            editor.commands.insertContent('def');
            fireEvent.click(screen.getByTestId('toolbar-italic'))
            editor.commands.insertContent('ghi');
        });
        expect(editor.getHTML()).toBe('<p><em>abc</em>def<em>ghi</em></p>');
    });
    it('alternating between underlined and regular text', async () => {
        const editor = await (window as any).__editor;
        fireEvent.click(screen.getByTestId('toolbar-underline'))
        await act(async () => {
            editor.commands.insertContent('abc');
            fireEvent.click(screen.getByTestId('toolbar-underline'))
            editor.commands.insertContent('def');
            fireEvent.click(screen.getByTestId('toolbar-underline'))
            editor.commands.insertContent('ghi');
        });
        expect(editor.getHTML()).toBe('<p><u>abc</u>def<u>ghi</u></p>');
    });
    it('alternating between striked and regular text', async () => {
        const editor = await (window as any).__editor;
        fireEvent.click(screen.getByTestId('toolbar-strike'))
        await act(async () => {
            editor.commands.insertContent('abc');
            fireEvent.click(screen.getByTestId('toolbar-strike'))
            editor.commands.insertContent('def');
            fireEvent.click(screen.getByTestId('toolbar-strike'))
            editor.commands.insertContent('ghi');
        });
        expect(editor.getHTML()).toBe('<p><s>abc</s>def<s>ghi</s></p>');
    });
    describe('Lists', () => {
        it('clicking taskList button should add a list tag', async () => {
            const editor = await (window as any).__editor;
            await user.click(screen.getByTestId('toolbar-taskList'));
            expect(editor.getHTML()).toContain('</li>');
        });
        it('clicking bulletList button should add a list tag', async () => {
            const editor = await (window as any).__editor;
            fireEvent.click(screen.getByTestId('toolbar-bulletList'));
            expect(editor.getHTML()).toContain('</li>');
        });
        it('clicking orderedList button should add a list tag', async () => {
            const editor = await (window as any).__editor;
            fireEvent.click(screen.getByTestId('toolbar-orderedList'));
            expect(editor.getHTML()).toContain('</li>');
        });
        it('clicking tasklist button twice should not create a list', async () => {
            const editor = await (window as any).__editor;
            fireEvent.click(screen.getByTestId('toolbar-taskList'));
            fireEvent.click(screen.getByTestId('toolbar-taskList'));
            expect(editor.getHTML()).not.toContain('</li>');
        });
        it('clicking bulletList button twice should not create a list', async () => {
            const editor = await (window as any).__editor;
            fireEvent.click(screen.getByTestId('toolbar-bulletList'));
            fireEvent.click(screen.getByTestId('toolbar-bulletList'));
            expect(editor.getHTML()).not.toContain('</li>');
        });
        it('clicking orderedList button twice should not create a list', async () => {
            const editor = await (window as any).__editor;
            fireEvent.click(screen.getByTestId('toolbar-orderedList'));
            fireEvent.click(screen.getByTestId('toolbar-orderedList'));
            expect(editor.getHTML()).not.toContain('</li>');
        });
        it('selecting a new list type should override the previous list', async () => {
            const editor = await (window as any).__editor;
            fireEvent.click(screen.getByTestId('toolbar-orderedList'));
            fireEvent.click(screen.getByTestId('toolbar-bulletList'));
            expect(editor.getHTML()).not.toContain('</ol>');
        });
    });
});
