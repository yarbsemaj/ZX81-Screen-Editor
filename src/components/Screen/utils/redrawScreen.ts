import { CHAR_SIZE, SCREEN_SCALE, SCREEN_WIDTH } from "../ScreenEditor";

/**
 * Redraws the ZX81 screen on the provided canvas context.
 * @param ctx CanvasRenderingContext2D
 * @param canvas HTMLCanvasElement
 * @param screenState Uint8Array representing the screen state
 * @param charSetImage HTMLImageElement containing the charset
 * @param selectedMode Current paint mode
 * @param charPositionsRef Ref for text cursor position
 * @param selectToolRef Ref for selection tool state
 */
export function redrawScreen(
  ctx: CanvasRenderingContext2D | null,
  canvas: HTMLCanvasElement | null,
  screenState: Uint8Array,
  charSetImage: HTMLImageElement,
  selectedMode: string,
  charPositionsRef: { x: number; y: number },
  selectToolRef: {
    source?: { x: number; y: number; width: number; height: number };
    destination?: { x: number; y: number };
    copyBuffer?: Uint8Array;
  } | null,
) {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Redraw the screen based on screenState
  for (let i = 0; i < screenState.length; i++) {
    const char = screenState[i];
    const x = i % SCREEN_WIDTH;
    const y = Math.floor(i / SCREEN_WIDTH);
    ctx.drawImage(
      charSetImage,
      (char % CHAR_SIZE) * CHAR_SIZE,
      Math.floor(char / CHAR_SIZE) * CHAR_SIZE,
      CHAR_SIZE,
      CHAR_SIZE,
      x * CHAR_SIZE * SCREEN_SCALE,
      y * CHAR_SIZE * SCREEN_SCALE,
      CHAR_SIZE * SCREEN_SCALE,
      CHAR_SIZE * SCREEN_SCALE,
    );
  }

  if (selectedMode === "text") {
    // Draw text cursor
    const cursorX = charPositionsRef.x;
    const cursorY = charPositionsRef.y;
    ctx.strokeStyle = "#7bf1a8";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      cursorX * CHAR_SIZE * SCREEN_SCALE,
      cursorY * CHAR_SIZE * SCREEN_SCALE,
      CHAR_SIZE * SCREEN_SCALE,
      CHAR_SIZE * SCREEN_SCALE,
    );
  } else if (selectedMode === "select" && selectToolRef?.source) {
    ctx.setLineDash([6]);
    // Draw selection rectangle
    const source = selectToolRef.source;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      source.x * CHAR_SIZE * SCREEN_SCALE,
      source.y * CHAR_SIZE * SCREEN_SCALE,
      source.width * CHAR_SIZE * SCREEN_SCALE,
      source.height * CHAR_SIZE * SCREEN_SCALE,
    );
    if (selectToolRef.destination) {
      const dest = selectToolRef.destination;
      ctx.strokeStyle = "#3b82f6";
      ctx.strokeRect(
        dest.x * CHAR_SIZE * SCREEN_SCALE,
        dest.y * CHAR_SIZE * SCREEN_SCALE,
        source.width * CHAR_SIZE * SCREEN_SCALE,
        source.height * CHAR_SIZE * SCREEN_SCALE,
      );
    }
    ctx.setLineDash([]);
  }
}
