import { ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import InvalidParametersError from '../lib/InvalidParametersError';
import Player from '../lib/Player';
import {
  BoundingBox,
  NoteTakingArea as NoteTakingAreaModel,
  InteractableCommand,
  InteractableCommandReturnType,
  TownEmitter,
  NoteTakingAreaUpdateCommand,
  Note,
} from '../types/CoveyTownSocket';
import InteractableArea from './InteractableArea';

export default class NoteTakingArea extends InteractableArea {
  public handleCommand<CommandType extends InteractableCommand>(
    command: CommandType,
  ): InteractableCommandReturnType<CommandType> {
    if (command.type === 'NoteTakingAreaUpdate') {
      const updateCommand = command as NoteTakingAreaUpdateCommand;
      this.notes = updateCommand.notes;
      this._emitAreaChanged();
      return undefined as InteractableCommandReturnType<CommandType>;
    }
    throw new InvalidParametersError('Unknown command type');
  }

  /* The notes in the note-taking area */
  public notes?: Note[];

  /** The note-taking area is "active" when there are players inside of it  */
  public get isActive(): boolean {
    return this._occupants.length > 0;
  }

  /**
   * Creates a new NoteTakingArea
   *
   * @param noteTakingAreaModel model containing this area's current notes and its ID
   * @param coordinates  the bounding box that defines this note-taking area
   * @param townEmitter a broadcast emitter that can be used to emit updates to players
   */
  public constructor(
    { notes, id }: Omit<NoteTakingAreaModel, 'type'>,
    coordinates: BoundingBox,
    townEmitter: TownEmitter,
  ) {
    super(id, coordinates, townEmitter);
    this.notes = notes;
  }

  /**
   * Convert this NoteTakingArea instance to a simple NoteTakingAreaModel suitable for serialization
   */
  public toModel(): NoteTakingAreaModel {
    return {
      id: this.id,
      type: 'NoteTakingArea',
      notes: this.notes,
      occupants: this.occupantsByID,
    };
  }

  public static fromMapObject(
    mapObject: ITiledMapObject,
    broadcastEmitter: TownEmitter,
  ): NoteTakingArea {
    const { name, width, height } = mapObject;
    if (!width || !height) {
      throw new Error(`Malformed viewing area ${name}`);
    }
    const rect: BoundingBox = { x: mapObject.x, y: mapObject.y, width, height };
    return new NoteTakingArea(
      {
        id: name,
        occupants: [],
        notes: [{ id: 'note-1', title: 'Untitled Note 1', content: '<p>New Note</p>' }],
      },
      rect,
      broadcastEmitter,
    );
  }

  public remove(player: Player) {
    super.remove(player);
    if (this._occupants.length === 0) {
      this.notes = undefined;
      this._emitAreaChanged();
    }
  }
}
