import { CHAR_SIZE, SCREEN_SCALE, SCREEN_WIDTH_PIXELS } from "../ScreenEditor";

// Utility functions extracted from ScreenEditor.tsx
export function calculateRenderedScreenScale(windowWidth: number): number {
  return windowWidth < 1536 ? (windowWidth - 40) / SCREEN_WIDTH_PIXELS : 2;
}

export function persistState(screenStateRef: React.RefObject<Uint8Array>) {
  window.localStorage.setItem(
    "screenState",
    JSON.stringify(Array.from(screenStateRef.current!)),
  );
}

export function pushToUndoBuffer(
  screenStateUndoBufferRef: React.RefObject<Uint8Array[] | null>,
  screenStateRedoBufferRef: React.RefObject<Uint8Array[] | null>,
  screenStateRef: React.RefObject<Uint8Array>,
  forceUpdate: () => void,
) {
  screenStateUndoBufferRef.current?.push(
    new Uint8Array([...screenStateRef.current!]),
  );
  screenStateRedoBufferRef.current = [];
  if (
    screenStateUndoBufferRef.current &&
    screenStateUndoBufferRef.current.length > 50
  ) {
    screenStateUndoBufferRef.current.shift();
  }
  forceUpdate();
}

const BitmapCharMap = {
  0: { tl: false, tr: false, bl: false, br: false }, // ' '
  1: { tl: true, tr: false, bl: false, br: false }, // '▘'
  2: { tl: false, tr: true, bl: false, br: false }, // '▝'
  3: { tl: true, tr: true, bl: false, br: false }, // '▀'
  4: { tl: false, tr: false, bl: true, br: false }, // '▖'
  5: { tl: true, tr: false, bl: true, br: false }, // '▌'
  6: { tl: false, tr: true, bl: true, br: false }, // '▞'
  7: { tl: true, tr: true, bl: true, br: false }, // '▛'
  64: { tl: true, tr: true, bl: true, br: true }, // '■'
  65: { tl: false, tr: true, bl: true, br: true }, // '▟'
  66: { tl: true, tr: false, bl: true, br: true }, // '▙'
  67: { tl: false, tr: false, bl: true, br: true }, // '▄'
  68: { tl: true, tr: true, bl: false, br: true }, // '▜'
  69: { tl: false, tr: true, bl: false, br: true }, // '▐'
  70: { tl: true, tr: false, bl: false, br: true }, // '▚'
  71: { tl: false, tr: false, bl: false, br: true }, // '▗'
} as { [key: number]: { tl: boolean; tr: boolean; bl: boolean; br: boolean } };

const printableCharString =
  '"£$:?()><=+-*/;,.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const getBitmapCharCode = (
  tl: boolean,
  tr: boolean,
  bl: boolean,
  br: boolean,
): number => {
  return Object.keys(BitmapCharMap).find((key) => {
    const char = BitmapCharMap[Number(key) as keyof typeof BitmapCharMap];
    return char.tl === tl && char.tr === tr && char.bl === bl && char.br === br;
  }) as unknown as number;
};

export const getBitmapFromCharCode = (
  code: number,
): (typeof BitmapCharMap)[keyof typeof BitmapCharMap] => {
  return BitmapCharMap[code as keyof typeof BitmapCharMap]
    ? { ...BitmapCharMap[code as keyof typeof BitmapCharMap] }
    : {
        tl: false,
        tr: false,
        bl: false,
        br: false,
      };
};

export const calculateCharForPixelDrawing = (
  x: number,
  y: number,
  char: number,
  erase: boolean,
): number => {
  const currentBitmap = getBitmapFromCharCode(char);
  if (x === 0 && y === 0) {
    currentBitmap.tl = !erase;
  } else if (x === 1 && y === 0) {
    currentBitmap.tr = !erase;
  } else if (x === 0 && y === 1) {
    currentBitmap.bl = !erase;
  } else if (x === 1 && y === 1) {
    currentBitmap.br = !erase;
  }
  const newChar = getBitmapCharCode(
    currentBitmap.tl,
    currentBitmap.tr,
    currentBitmap.bl,
    currentBitmap.br,
  );
  return newChar;
};

export const downLoadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const keyboardEventToChar = (e: KeyboardEvent): number | null => {
  const key = e.key;
  if (key.length > 1) return null; // Not a single character

  if (key === " ") return 0; // Space character

  const charIndex = printableCharString.indexOf(key.toUpperCase());
  if (charIndex !== -1) {
    return charIndex + 11; // Offset to match ZX81 character codes
  }
  return null;
};

export const mouseEventToCoordinates = (
  event: MouseEvent | TouchEvent,
  element: HTMLElement,
  renderedScreenScale: number,
) => {
  const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
  const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;
  const rect = element.getBoundingClientRect();
  const x = (clientX - rect.left) / renderedScreenScale;
  const y = (clientY - rect.top) / renderedScreenScale;
  const charX = Math.floor(x / (CHAR_SIZE * SCREEN_SCALE));
  const charY = Math.floor(y / (CHAR_SIZE * SCREEN_SCALE));
  const charIndex = charY * 32 + charX;
  const quadrantX = Math.floor(
    (x % (CHAR_SIZE * SCREEN_SCALE)) / ((CHAR_SIZE * SCREEN_SCALE) / 2),
  );
  const quadrantY = Math.floor(
    (y % (CHAR_SIZE * SCREEN_SCALE)) / ((CHAR_SIZE * SCREEN_SCALE) / 2),
  );
  return { charIndex, quadrantX, quadrantY, charX, charY };
};
