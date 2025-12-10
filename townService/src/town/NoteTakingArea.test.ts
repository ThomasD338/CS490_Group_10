import {mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import Player from '../lib/Player';
import { getLastEmittedEvent } from '../TestUtils';
import { PlayerID, TownEmitter, Note } from '../types/CoveyTownSocket';
import NoteTakingArea from "./NoteTakingArea";

describe("NoteTakingArea", () => {
    const testAreaBox = { x: 100, y: 100, width: 100, height: 100 };
    let testArea: NoteTakingArea;
    const townEmitter = mock<TownEmitter>();
    const id = nanoid();
    let newPlayer: Player;
    const initialNotes: Note[] = [];

    beforeEach(() => {
        mockClear(townEmitter);
        testArea = new NoteTakingArea({ id, occupants: [], notes: initialNotes }, testAreaBox, townEmitter);
        newPlayer = new Player(nanoid(), mock<TownEmitter>());
        testArea.add(newPlayer);
    });
    describe("add", () => {
        it("Adds the player to the occupants list and emits an interactableUpdate event", () => {
            expect(testArea.occupantsByID).toEqual([newPlayer.id]);
            const lastEmittedUpdate = getLastEmittedEvent(townEmitter, "interactableUpdate");
            expect(lastEmittedUpdate).toEqual({
                id,
                notes: initialNotes,
                occupants: [newPlayer.id],
                type: "NoteTakingArea",
            });
        });
        it("Sets the player's interactableID and emits an update for their location", () => {
            expect(newPlayer.location.interactableID).toEqual(id);
            const lastEmittedMovement = getLastEmittedEvent(townEmitter, "playerMoved");
            expect(lastEmittedMovement.location.interactableID).toEqual(id);
        });
        it("Sets the notes area to actice when the first player enters", () => {
            expect(testArea.isActive).toBe(true);
        });
    });
    describe("remove", () => {
        it("Removes the player from the list of occupants and emits an interactableUpdate event", () => {
            // Add another player so that we are not also testing what happens when the last player leaves
            const extraPlayer = new Player(nanoid(), mock<TownEmitter>());
            testArea.add(extraPlayer);
            testArea.remove(newPlayer);
        });
        it("Clears the player's interactableID and emits an update for their location", () => {
            testArea.remove(newPlayer);
            expect(newPlayer.location.interactableID).toBeUndefined();
            const lastEmittedMovement = getLastEmittedEvent(townEmitter, "playerMoved");
            expect(lastEmittedMovement.location.interactableID).toBeUndefined();
        });
        it("Sets the notes area to inactive when the last player leaves", () => {
            testArea.remove(newPlayer);
            expect(testArea.isActive).toBe(false);
        });
        it("Clears the notes when the last occupant leaves", () => {
            testArea.remove(newPlayer);
            const lastEmittedUpdate = getLastEmittedEvent(townEmitter, "interactableUpdate");
            expect(lastEmittedUpdate).toEqual({
                id,
                notes: undefined,
                occupants: [],
                type: "NoteTakingArea",
            });
        });
    });
}); 
