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
