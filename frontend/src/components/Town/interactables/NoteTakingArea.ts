import NoteTakingAreaController, {
  NoteTakingAreaEvents,
} from '../../../classes/interactable/NoteTakingAreaController';
import { Note } from '../../../types/CoveyTownSocket';
import Interactable, { KnownInteractableTypes } from '../Interactable';

export default class NoteTakingArea extends Interactable {
  private _labelText?: Phaser.GameObjects.Text;

  private _isInteracting = false;

  private _noteTakingArea?: NoteTakingAreaController;

  private _changeListener?: NoteTakingAreaEvents['notesChange'];

  private _notes = NoteTakingAreaController._initializeNotes(undefined);

  getType(): KnownInteractableTypes {
    return 'noteTakingArea';
  }

  get notes(): Note[] {
    return this._notes;
  }

  set notes(newNotes: Note[]) {
    this._notes = newNotes;
    this._noteTakingArea?.emit('notesChange', newNotes);
  }

  get controller(): NoteTakingAreaController | undefined {
    return this._noteTakingArea;
  }

  addedToScene() {
    super.addedToScene();
    this.setTintFill();
    this.setAlpha(0.3);
    this.setDepth(-1);
    this.scene.add.text(
      this.x - this.displayWidth / 2,
      this.y + this.displayHeight / 2,
      this.name,
      { color: '#FFFFFF', backgroundColor: '#000000' },
    );
    this._labelText = this.scene.add.text(
      this.x - this.displayWidth / 2,
      this.y - this.displayHeight / 2,
      `Press space to take notes`,
      { color: '#FFFFFF', backgroundColor: '#000000' },
    );
    this._noteTakingArea = this.townController.getNoteTakingAreaController(this);
    this._changeListener = newNotes => this._updateLabelText(newNotes);
  }

  private _updateLabelText(newNotes: Note[]) {
    this._labelText?.setText(`Press space to take notes (${newNotes.length})`);
  }

  removedFromScene(): void {
    if (this._changeListener) {
      this._noteTakingArea?.removeListener('notesChange', this._changeListener);
    }
  }

  interact(): void {
    this._labelText?.setVisible(false);
    this._isInteracting = true;
  }

  overlap(): void {
    if (!this._labelText) {
      throw new Error('Should not be able to overlap with this interactable before added to scene');
    }
    const location = this.townController.ourPlayer.location;
    this._labelText.setX(location.x);
    this._labelText.setY(location.y);
    this._labelText.setVisible(true);
  }

  overlapExit(): void {
    this._labelText?.setVisible(false);
    if (this._isInteracting) {
      this.townController.interactableEmitter.emit('endInteraction', this);
      this._isInteracting = false;
    }
  }
}
