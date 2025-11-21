import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../ScreenEditor";
import { downLoadBlob } from "./utils";

export function saveScreenState(screenStateRef: React.RefObject<Uint8Array>) {
  const blob = new Blob([new Uint8Array(screenStateRef.current)], {
    type: "application/octet-stream",
  });
  downLoadBlob(blob, "screenState.zss");
}

export function exportScreenAsPNG(
  canvasRef: React.RefObject<HTMLCanvasElement>,
) {
  const canvas = canvasRef.current;
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (blob) {
      downLoadBlob(blob, "screen.png");
    }
  });
}

export function exportScreenAsASM(screenStateRef: React.RefObject<Uint8Array>) {
  let asmOutput = "";
  for (let i = 0; i < SCREEN_HEIGHT; i++) {
    let asmLine = "\t.byte\t$76,";
    for (let j = 0; j < SCREEN_WIDTH; j++) {
      const charIndex = i * SCREEN_WIDTH + j;
      let charCode = screenStateRef.current[charIndex];
      if (charCode > 32) {
        charCode += 64;
      }
      asmLine += `$${charCode.toString(16).padStart(2, "0")},`;
    }
    asmLine = asmLine.slice(0, -1);
    asmOutput += asmLine + "\n";
  }
  asmOutput += "\t.byte\t$76";
  const blob = new Blob([asmOutput], { type: "text/plain" });
  downLoadBlob(blob, "screen.asm");
}

export function openScreenFile(
  setError: (msg: string | null) => void,
  screenStateRef: React.RefObject<Uint8Array>,
  forceUpdate: () => void,
  pushToUndoBuffer: (
    undoBufferRef: React.RefObject<Uint8Array[] | null>,
    redoBufferRef: React.RefObject<Uint8Array[] | null>,
    stateRef: React.RefObject<Uint8Array>,
    forceUpdate: () => void,
  ) => void,
  redrawScreen: () => void,
  persistState: (ref: React.RefObject<Uint8Array>) => void,
  screenStateUndoBufferRef: React.RefObject<Uint8Array[] | null>,
  screenStateRedoBufferRef: React.RefObject<Uint8Array[] | null>,
) {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".zss,.asm,.txt,.bin";
  fileInput.click();
  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result && result instanceof ArrayBuffer) {
        let array = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT);
        if (result.byteLength === SCREEN_WIDTH * SCREEN_HEIGHT) {
          array = new Uint8Array(result);
        } else {
          const text = new TextDecoder().decode(result);
          const cleanedText = text
            .replaceAll("\r", "")
            .replaceAll("\n", "")
            .replaceAll("\t.byte\t$76", "")
            .replaceAll("$", "")
            .substring(1);
          const byteArray = cleanedText.split(",").map((s) => {
            const int = parseInt(s, 16);
            if (int > 96) {
              return int - 64;
            }
            return int;
          });
          if (byteArray.length === SCREEN_WIDTH * SCREEN_HEIGHT) {
            array = new Uint8Array(byteArray);
          } else {
            setError(
              "Invalid file format detected, please select a valid screen state file or exported ASM file.",
            );
            return;
          }
        }
        pushToUndoBuffer(
          screenStateUndoBufferRef,
          screenStateRedoBufferRef,
          screenStateRef,
          forceUpdate,
        );
        screenStateRef.current = array;
        redrawScreen();
        persistState(screenStateRef);
      }
    };
  };
}
