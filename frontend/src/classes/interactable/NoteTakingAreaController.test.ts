import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import TownController from '../TownController';
import { Editor } from '@tiptap/react';
import NoteTakingAreaController, { NoteTakingAreaEvents } from './NoteTakingAreaController';
import NotesToolbar from '../../components/Town/interactables/NotesToolBar';

import { PlayerLocation } from '../../types/CoveyTownSocket';
import PlayerController from '../PlayerController';

describe('Note Editing', () => {
    // A valid NoteTakingAreaController to be reused within the tests
    let testArea: NoteTakingAreaController;
    const mockListeners = mock<NoteTakingAreaEvents>();
    const mockTownController = mock<TownController>();
    beforeEach(() => {
        const playerLocation: PlayerLocation = {
            moving: false,
            x: 0,
            y: 0,
            rotation: 'front',
        };
        testArea = new NoteTakingAreaController(nanoid(), 'New Note', mockTownController);
        testArea.occupants = [
          new PlayerController(nanoid(), nanoid(), playerLocation),
          new PlayerController(nanoid(), nanoid(), playerLocation),
        ];
        testArea.addListener('notesChange', mockListeners.notesChange);
    });
    it('should open to the default, untitled new note', () => {
        expect(testArea.notes.length).toBe(1);
        expect(testArea.notes[0].content).toBe('New Note');
        expect(testArea.notes[0].title).toBe('Untitled Note 1');
        expect(testArea.notes[0].id).toBe('default-note-1');
    });
});
