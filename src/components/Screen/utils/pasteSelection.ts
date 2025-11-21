import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../ScreenEditor";
import { pushToUndoBuffer, persistState } from "./utils";

/**
 * Pastes the selected area from the copy buffer to the destination on the screen.
 * @param selectToolRef Ref containing selection tool state
 * @param screenStateUndoBufferRef Undo buffer ref
 * @param screenStateRedoBufferRef Redo buffer ref
 * @param screenStateRef Screen state ref
 * @param forceUpdate Function to force React update
 * @param redrawScreen Function to redraw the screen
 */
export function pasteSelection(
  selectToolRef: React.RefObject<{
    source: { x: number; y: number; width: number; height: number };
    destination?: { x: number; y: number };
    copyBuffer?: Uint8Array;
  } | null>,
  screenStateUndoBufferRef: React.RefObject<Uint8Array[] | null>,
  screenStateRedoBufferRef: React.RefObject<Uint8Array[] | null>,
  screenStateRef: React.RefObject<Uint8Array>,
  forceUpdate: () => void,
  redrawScreen: () => void,
) {
  if (selectToolRef.current?.destination && selectToolRef.current?.copyBuffer) {
    pushToUndoBuffer(
      screenStateUndoBufferRef,
      screenStateRedoBufferRef,
      screenStateRef,
      forceUpdate,
    );
    const destX = selectToolRef.current.destination.x;
    const destY = selectToolRef.current.destination.y;
    const source = selectToolRef.current.source;
    const copyBuffer = selectToolRef.current.copyBuffer;
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const dstX = destX + x;
        const dstY = destY + y;
        if (
          dstX < 0 ||
          dstX >= SCREEN_WIDTH ||
          dstY < 0 ||
          dstY >= SCREEN_HEIGHT
        ) {
          continue; // Skip out-of-bounds
        }
        const dstIndex = dstY * SCREEN_WIDTH + dstX;
        const bufferIndex = y * source.width + x;
        //Move from copy buffer to screen state
        screenStateRef.current[dstIndex] = copyBuffer[bufferIndex];
      }
    }
    persistState(screenStateRef);
    redrawScreen();
  }
}
