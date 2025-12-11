import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import Player from '../lib/Player';
import { getLastEmittedEvent } from '../TestUtils';
import { TownEmitter, Note } from '../types/CoveyTownSocket';
import NoteTakingArea from './NoteTakingArea';

describe('NoteTakingArea', () => {
  const testAreaBox = { x: 100, y: 100, width: 100, height: 100 };
  let testArea: NoteTakingArea;
  const townEmitter = mock<TownEmitter>();
  const id = nanoid();
  let newPlayer: Player;
  const initialNotes: Note[] = [];
  let testNote1: Note;
  let testNote2: Note;

  beforeEach(() => {
    mockClear(townEmitter);
    testArea = new NoteTakingArea(
      { id, occupants: [], notes: initialNotes },
      testAreaBox,
      townEmitter,
    );
    newPlayer = new Player(nanoid(), mock<TownEmitter>());
    testArea.add(newPlayer);
    testNote1 = { id: 'note-1', title: 'Test Note 1', content: '<p>This is test note 1.</p>' };
    testNote2 = { id: 'note-2', title: 'Test Note 2', content: '<p>This is test note 2.</p>' };
  });
  describe('add', () => {
    it('Adds the player to the occupants list and emits an interactableUpdate event', () => {
      expect(testArea.occupantsByID).toEqual([newPlayer.id]);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        id,
        notes: initialNotes,
        occupants: [newPlayer.id],
        type: 'NoteTakingArea',
      });
    });
    it('Sets the players interactableID and emits an update for their location', () => {
      expect(newPlayer.location.interactableID).toEqual(id);
      const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
      expect(lastEmittedMovement.location.interactableID).toEqual(id);
    });
    it('Sets the notes area to actice when the first player enters', () => {
      expect(testArea.isActive).toBe(true);
    });
  });
  describe('remove', () => {
    it('Removes the player from the list of occupants and emits an interactableUpdate event', () => {
      // Add another player so that we are not also testing what happens when the last player leaves
      const extraPlayer = new Player(nanoid(), mock<TownEmitter>());
      testArea.add(extraPlayer);
      testArea.remove(newPlayer);
    });
    it('Clears the players interactableID and emits an update for their location', () => {
      testArea.remove(newPlayer);
      expect(newPlayer.location.interactableID).toBeUndefined();
      const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
      expect(lastEmittedMovement.location.interactableID).toBeUndefined();
    });
    it('Sets the notes area to inactive when the last player leaves', () => {
      testArea.remove(newPlayer);
      expect(testArea.isActive).toBe(false);
    });
    it('Clears the notes when the last occupant leaves', () => {
      testArea.remove(newPlayer);
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(testArea.notes).toBeUndefined();
      expect(testArea.occupantsByID.length).toBe(0);
      expect(lastEmittedUpdate).toEqual({
        id,
        notes: undefined,
        occupants: [],
        type: 'NoteTakingArea',
      });
    });
  });
  describe('Update Notes', () => {
    it('Updates the notes in the area and emits an interactableUpdate event', () => {
      testArea.handleCommand({ type: 'NoteTakingAreaUpdate', notes: [testNote1, testNote2] });
      const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
      expect(lastEmittedUpdate).toEqual({
        id,
        notes: [testNote1, testNote2],
        occupants: [newPlayer.id],
        type: 'NoteTakingArea',
      });
    });
    it('Makes sure notes get updated correctly', () => {
      testArea.notes = [testNote1];
      expect(testArea.notes).toEqual([testNote1]);
      testArea.notes = [testNote2];
      expect(testArea.notes).toEqual([testNote2]);
    });
    it('Allows notes to be cleared', () => {
      testArea.notes = [testNote1];
      expect(testArea.notes).toEqual([testNote1]);
      testArea.notes = [];
      expect(testArea.notes).toEqual([]);
    });
  });
  test('toModel sets id, type, notes, and occupants', () => {
    const model = testArea.toModel();
    expect(model).toEqual({
      id,
      notes: initialNotes,
      occupants: [newPlayer.id],
      type: 'NoteTakingArea',
    });
  });
  describe('fromMapObject', () => {
    it('Throws an error if the map object is malformed', () => {
      expect(() => {
        NoteTakingArea.fromMapObject(
          { id: 1, name: 'BadNoteArea', x: 0, y: 0, visible: true },
          townEmitter,
        );
      }).toThrowError(`Malformed notetaking area BadNoteArea`);
    });
    it('Creates a NoteTakingArea from a valid map object', () => {
      const x = 30;
      const y = 20;
      const width = 10;
      const height = 20;
      const name = 'name';
      const val = NoteTakingArea.fromMapObject(
        { x, y, width, height, name, id: 10, visible: true },
        townEmitter,
      );
      expect(val.boundingBox).toEqual({ x, y, width, height });
      expect(val.id).toEqual(name);
      expect(val.occupantsByID).toEqual([]);
      expect(val.notes).toEqual([
        { id: 'note-1', title: 'Untitled Note 1', content: '<p>New Note</p>' },
      ]);
    });
  });
});
