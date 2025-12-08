import { useEffect, useState } from 'react';
import TownController from '../TownController';
import { NoteTakingArea, NoteTakingAreaUpdateCommand, Note } from '../../types/CoveyTownSocket';
import PlayerController from '../PlayerController';
import InteractableAreaController, {
  BaseInteractableEventMap,
  NOTE_TAKING_AREA_TYPE,
} from './InteractableAreaController';

/**
 * The events that the NoteTakingAreaController emits to subscribers. These events
 * are only ever emitted to local components (not to the townService).
 */
export type NoteTakingAreaEvents = BaseInteractableEventMap & {
  notesChange: (newNotes: Note[]) => void;
};

/**
 * A NoteTakingAreaController manages the local behavior of a note-taking area in the frontend,
 * implementing the logic to bridge between the townService's interpretation of note-taking areas and the
 * frontend's. The NoteTakingAreaController emits events when the note-taking area changes.
 */
export default class NoteTakingAreaController extends InteractableAreaController<
  NoteTakingAreaEvents,
  NoteTakingArea
> {
  toInteractableAreaModel(): NoteTakingArea {
    return {
      id: this.id,
      occupants: this.occupants.map(player => player.id),
      notes: this._notes.length > 0 ? this._notes : undefined,
      type: 'NoteTakingArea',
    };
  }

  protected _updateFrom(newModel: NoteTakingArea): void {
    this._setNotes(newModel.notes);
  }

  public isActive(): boolean {
    return this.occupants.length > 0;
  }

  public get friendlyName(): string {
    return 'Notes';
  }

  public get type(): string {
    return NOTE_TAKING_AREA_TYPE;
  }

  private _notes: Note[] = [];

  private static _initializeNotes(notes: Note[] | string | undefined): Note[] {
    if (Array.isArray(notes)) {
      return notes;
    }
    // Handle old single string format or undefined/empty data
    const content = typeof notes === 'string' ? notes : '';
    return [
      {
        id: 'default-note-1', // Placeholder ID. Using a simple string for now.
        title: 'Untitled Note 1',
        content: content,
      },
    ];
  }

  /**
   * Create a new NoteTakingAreaController
   * @param id
   * @param notes
   */
  constructor(id: string, notes: Note[] | string | undefined, townController: TownController) {
    super(id, townController);
    this._notes = NoteTakingAreaController._initializeNotes(notes);
  }

  /**
   * The notes of the note-taking area. Changing the notes will emit a notesChange event
   */
  private _setNotes(newNotes: Note[] | undefined) {
    const initializedNotes = NoteTakingAreaController._initializeNotes(newNotes);

    // If the new array is a different object reference, we treat it as changed.
    if (this._notes !== initializedNotes) {
      this.emit('notesChange', initializedNotes);
    }
    this._notes = initializedNotes;
  }

  get notes(): Note[] {
    return this._notes;
  }

  /**
   * Sends a command to the server to update the notes content.
   * @param newNotes The new notes content (Note[]).
   */
  public async updateNotes(newNotes: Note[]) {
    const command: NoteTakingAreaUpdateCommand = {
      type: 'NoteTakingAreaUpdate',
      notes: newNotes,
    };
    await this.townController.sendInteractableCommand(this.id, command);
  }

  static fromNoteTakingAreaModel(
    model: NoteTakingArea,
    townController: TownController,
    playerFinder: (PlayerIDs: string[]) => PlayerController[],
  ): NoteTakingAreaController {
    // model.notes is Note[] | undefined, which is handled in the constructor via initializeNotes
    const ret = new NoteTakingAreaController(model.id, model.notes, townController);
    ret.occupants = playerFinder(model.occupants);
    return ret;
  }
}

export function useNoteTakingAreaNotes(area: NoteTakingAreaController): Note[] {
  const [notes, setNotes] = useState(area.notes);

  useEffect(() => {
    area.addListener('notesChange', setNotes);
    return () => {
      area.removeListener('notesChange', setNotes);
    };
  }, [area]);
  return notes;
}