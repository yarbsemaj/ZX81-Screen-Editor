import React, { useEffect, useReducer, useRef, useState } from "react";
import { CharPicker } from "../CharPicker/CharPicker";
import charSet from "../../assets/charSet.png";
import {
  calculateCharForPixelDrawing,
  downLoadBlob,
  keyboardEventToChar,
  mouseEventToCoordinates,
} from "./utils";
import Button from "../Button/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateLeft, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import Modal from "../Modal/Modal";
import HelpModal from "../Modal/HelpModal";
import initialScreenState from "../../assets/initialScreenState.json";

interface ScreenEditorProps {}

export type PaintMode = "pencil" | "character" | "text" | "select";
export type PalletteMode = "black" | "white";

export const SCREEN_SCALE = 1; // Scale factor for the screen display
export const CHAR_SIZE = 16; // Size of each character in pixels
export const SCREEN_WIDTH = 32; // Number of characters horizontally
export const SCREEN_HEIGHT = 24; // Number of characters vertically
export const SCREEN_HEIGHT_PIXELS = SCREEN_HEIGHT * CHAR_SIZE * SCREEN_SCALE;
export const SCREEN_WIDTH_PIXELS = SCREEN_WIDTH * CHAR_SIZE * SCREEN_SCALE;

const ScreenEditor: React.FC<ScreenEditorProps> = () => {
  const [selectedChar, setSelectedChar] = useState<number>(1);
  const [selectedMode, setSelectedMode] = useState<PaintMode>("character");
  const [selectedPallette, setSelectedPallette] =
    useState<PalletteMode>("black");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const canvasCTXRef = useRef<CanvasRenderingContext2D | null>(null);
  const [renderedScreenScale, setRenderedScreenScale] = useState<number>(
    window.innerWidth < 1536
      ? (window.innerWidth - 40) / SCREEN_WIDTH_PIXELS
      : 2,
  );
  const screenStateRef = useRef<Uint8Array>(
    window.localStorage.getItem("screenState")
      ? new Uint8Array(
          JSON.parse(window.localStorage.getItem("screenState") as string),
        )
      : new Uint8Array(initialScreenState),
  ); // Empty screen state

  const screenStateUndoBufferRef = useRef<Uint8Array[] | null>([]);
  const screenStateRedoBufferRef = useRef<Uint8Array[] | null>([]);
  const [_, forceUpdate] = useReducer((x) => x + 1, 0);
  const charPositionsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const selectToolRef = useRef<{
    source: { x: number; y: number; width: number; height: number };
    destination?: { x: number; y: number };
    copyBuffer?: Uint8Array;
  } | null>(null);

  const charSetImage = new Image();
  charSetImage.src = charSet;
  charSetImage.onload = () => {
    redrawScreen();
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1536) {
        setRenderedScreenScale((window.innerWidth - 40) / SCREEN_WIDTH_PIXELS);
        return;
      } else {
        setRenderedScreenScale(2);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const clearScreen = () => {
    pushToUndoBuffer();
    screenStateRef.current.fill(0);
    persistState();
    redrawScreen();
  };

  const save = () => {
    // Implement save functionality
    const blob = new Blob([new Uint8Array(screenStateRef.current)], {
      type: "application/octet-stream",
    });
    downLoadBlob(blob, "screenState.zss");
  };

  const exportAsPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        downLoadBlob(blob, "screen.png");
      }
    });
  };

  const exportAsASM = () => {
    // Implement export as ASM functionality
    let asmOutput = "";
    for (let i = 0; i < SCREEN_HEIGHT; i++) {
      let asmLine = "	.byte	$76,"; // ASM line start (byte array then new line)
      for (let j = 0; j < SCREEN_WIDTH; j++) {
        const charIndex = i * SCREEN_WIDTH + j;
        let charCode = screenStateRef.current[charIndex];
        // Convert charCode to ASM representation
        if (charCode > 32) {
          charCode += 64;
        }
        asmLine += `$${charCode.toString(16).padStart(2, "0")},`;
      }
      asmLine = asmLine.slice(0, -1); // Remove trailing comma
      asmOutput += asmLine + "\n"; // Add new line
    }
    asmOutput += "	.byte	$76"; // End of screen data
    const blob = new Blob([asmOutput], { type: "text/plain" });
    downLoadBlob(blob, "screen.asm");
  };

  const open = () => {
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
            // Valid screen state file
            array = new Uint8Array(result);
          } else {
            //Are we loading an ASM exported file?
            const text = new TextDecoder().decode(result);
            const cleanedText = text
              .replaceAll("\r", "") // Remove carriage returns
              .replaceAll("\n", "") // Remove new lines
              .replaceAll("	.byte	$76", "") // Remove line starters
              .replaceAll("$", "") // Remove dollar signs
              .substring(1); // Remove leading comma

            //Convert to byte array
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
          pushToUndoBuffer();
          screenStateRef.current = array;
          redrawScreen();
          persistState();
        }
      };
    };
  };

  const undo = () => {
    const undoBuffer = screenStateUndoBufferRef.current;
    if (undoBuffer && undoBuffer.length > 0) {
      const previousState = undoBuffer.pop();
      if (previousState) {
        screenStateRedoBufferRef.current?.push(
          new Uint8Array([...screenStateRef.current]),
        );
        screenStateRef.current = previousState;
        persistState();
        redrawScreen();
        forceUpdate();
      }
    }
  };

  const redo = () => {
    const redoBuffer = screenStateRedoBufferRef.current;
    if (redoBuffer && redoBuffer.length > 0) {
      const nextState = redoBuffer.pop();
      if (nextState) {
        screenStateUndoBufferRef.current?.push(
          new Uint8Array([...screenStateRef.current]),
        );
        screenStateRef.current = nextState;
        persistState();
        redrawScreen();
        forceUpdate();
      }
    }
  };

  const persistState = () => {
    window.localStorage.setItem(
      "screenState",
      JSON.stringify(Array.from(screenStateRef.current)),
    );
  };

  const redrawScreen = () => {
    const ctx = canvasCTXRef.current;
    const canvas = canvasRef.current;
    const screenState = screenStateRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //Redraw the screen based on screenState
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
      //Draw text cursor
      const cursorX = charPositionsRef.current.x;
      const cursorY = charPositionsRef.current.y;
      ctx.strokeStyle = "#7bf1a8";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        cursorX * CHAR_SIZE * SCREEN_SCALE,
        cursorY * CHAR_SIZE * SCREEN_SCALE,
        CHAR_SIZE * SCREEN_SCALE,
        CHAR_SIZE * SCREEN_SCALE,
      );
    } else if (selectedMode === "select" && selectToolRef.current?.source) {
      ctx.setLineDash([6]);
      //Draw selection rectangle
      const source = selectToolRef.current.source;
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        source.x * CHAR_SIZE * SCREEN_SCALE,
        source.y * CHAR_SIZE * SCREEN_SCALE,
        source.width * CHAR_SIZE * SCREEN_SCALE,
        source.height * CHAR_SIZE * SCREEN_SCALE,
      );
      if (selectToolRef.current.destination) {
        const dest = selectToolRef.current.destination;
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
  };

  const pushToUndoBuffer = () => {
    screenStateUndoBufferRef.current?.push(
      new Uint8Array([...screenStateRef.current]),
    );
    screenStateRedoBufferRef.current = []; // Clear redo buffer on new action
    // Limit undo buffer size
    if (
      screenStateUndoBufferRef.current &&
      screenStateUndoBufferRef.current.length > 50
    ) {
      screenStateUndoBufferRef.current.shift();
    }
    forceUpdate();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvasCTXRef.current = ctx;

    redrawScreen();
  }, []);

  useEffect(() => {
    document.onkeydown = (e) => {
      if (e.ctrlKey && e.key === "z") {
        undo();
        return;
      }
      if (e.ctrlKey && e.key === "y") {
        redo();
        return;
      }

      if (selectedMode === "text") {
        let charCode = keyboardEventToChar(e);
        if (charCode !== null) {
          //Save current state to undo buffer
          pushToUndoBuffer();
          const charX = charPositionsRef.current.x;
          const charY = charPositionsRef.current.y;
          const charIndex = charY * SCREEN_WIDTH + charX;
          if (selectedPallette === "black") {
            charCode += 64;
          }
          screenStateRef.current[charIndex] = charCode;
          //Move cursor
          if (charX + 1 < SCREEN_WIDTH) {
            charPositionsRef.current.x += 1;
          } else if (charY + 1 < SCREEN_HEIGHT) {
            charPositionsRef.current.x = 0;
            charPositionsRef.current.y += 1;
          } else {
            //Wrap around to the beginning
            charPositionsRef.current.x = 0;
            charPositionsRef.current.y = 0;
          }
          persistState();
          redrawScreen();
          e.preventDefault();
        }
      } else if (selectedMode === "select") {
        // Handle select mode key events here
        if (e.key === "Escape") {
          // Cancel selection
          selectToolRef.current = null;
          redrawScreen();
          e.preventDefault();
        } else if (
          e.key === "Enter" &&
          selectToolRef.current?.destination &&
          selectToolRef.current?.copyBuffer
        ) {
          // Paste selection
          pushToUndoBuffer();
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
          persistState();
          redrawScreen();
          e.preventDefault();
        }
      }
    };

    return () => {
      document.onkeydown = null;
    };
  }, [selectedMode, selectedPallette]);

  useEffect(() => {
    if (selectedMode === "select") {
      selectToolRef.current = null;
    }
  }, [selectedMode]);

  useEffect(() => {
    let isMouseDown = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvasCTXRef.current;
    if (!ctx) return;

    const onmouseup = () => {
      isMouseDown = false;
    };

    const onmousedown = (event: MouseEvent | TouchEvent) => {
      // Save current state to undo buffer
      isMouseDown = true;
      if (selectedMode === "select") {
        //Start selection
        const { charX, charY } = mouseEventToCoordinates(
          event,
          canvas,
          renderedScreenScale,
        );
        if (!selectToolRef.current?.source) {
          //Start selection
          selectToolRef.current = {
            source: { x: charX, y: charY, width: 0, height: 0 },
          };
        } else {
          //Copy selection to the copy buffer
          const copyBuffer = [];
          const source = selectToolRef.current.source;
          for (let y = 0; y < source.height; y++) {
            for (let x = 0; x < source.width; x++) {
              const srcX = source.x + x;
              const srcY = source.y + y;

              const srcIndex = srcY * SCREEN_WIDTH + srcX;
              copyBuffer.push(screenStateRef.current[srcIndex]);
            }
          }
          //Finish selection
          selectToolRef.current.destination = { x: charX, y: charY };
          selectToolRef.current.copyBuffer = new Uint8Array(copyBuffer);
        }
        redrawScreen();
      } else if (selectedMode !== "text") {
        pushToUndoBuffer();
        persistState();
      }
    };

    const onmousemove = (e: MouseEvent | TouchEvent) => {
      if (isMouseDown) {
        if (selectedMode === "select") {
          const { charX, charY } = mouseEventToCoordinates(
            e,
            canvas,
            renderedScreenScale,
          );
          if (selectToolRef.current) {
            if (!selectToolRef.current?.destination) {
              //Updating selection box
              selectToolRef.current.source = {
                ...selectToolRef.current.source,
                width: charX - selectToolRef.current.source.x,
                height: charY - selectToolRef.current.source.y,
              };
            } else {
              //Move the destination
              selectToolRef.current.destination = { x: charX, y: charY };
            }
          }
          redrawScreen();
        } else {
          draw(e);
        }
      }
    };

    canvas.onmouseup = onmouseup;
    canvas.onmouseleave = onmouseup;
    canvas.ontouchend = onmouseup;
    canvas.ontouchcancel = onmouseup;

    canvas.onmousedown = onmousedown;
    canvas.ontouchstart = onmousedown;

    canvas.onmousemove = onmousemove;
    canvas.ontouchmove = onmousemove;

    canvas.onclick = (e) => {
      draw(e);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      const { charIndex, quadrantX, quadrantY, charX, charY } =
        mouseEventToCoordinates(e, canvas, renderedScreenScale);
      if (selectedMode === "character") {
        // Draw character at the clicked position
        screenStateRef.current[charIndex] = selectedChar;
      } else if (selectedMode === "pencil") {
        screenStateRef.current[charIndex] = calculateCharForPixelDrawing(
          quadrantX,
          quadrantY,
          screenStateRef.current[charIndex],
          selectedPallette === "white",
        );
      } else if (selectedMode === "text") {
        // Draw character at the clicked position and move cursor
        charPositionsRef.current = { x: charX, y: charY };
      }
      // Save to localStorage
      persistState();
      redrawScreen();
    };

    return () => {
      canvas.onmousemove = null;
      canvas.onmousedown = null;
      canvas.onmouseup = null;
      canvas.onmouseleave = null;
      canvas.onclick = null;
      canvas.ontouchend = null;
      canvas.ontouchcancel = null;
      canvas.ontouchstart = null;
      canvas.ontouchmove = null;
    };
  }, [selectedMode, selectedChar, selectedPallette, renderedScreenScale]);

  return (
    <div className="w-screen flex items-center flex-col gap-4 2xl:h-screen justify-center 2xl:p-0 p-4">
      <div className="flex 2xl:flex-row flex-col gap-4">
        <div className="boarder border-2 border-black w-fit h-fit shadow-[8px_8px_0_0_#000000]">
          <canvas
            style={{
              width: SCREEN_WIDTH_PIXELS * renderedScreenScale + "px",
              height: SCREEN_HEIGHT_PIXELS * renderedScreenScale + "px",
              imageRendering: "pixelated",
            }}
            className={`${selectedMode === "character" ? "cursor-pointer" : selectedMode === "text" ? "cursor-text" : "cursor-crosshair"}`}
            ref={canvasRef}
            width={SCREEN_WIDTH_PIXELS}
            height={SCREEN_HEIGHT_PIXELS}
          />
        </div>
        <CharPicker
          onSelectChar={setSelectedChar}
          selectedChar={selectedChar}
          onSelectMode={setSelectedMode}
          selectedMode={selectedMode}
          onSelectPallette={setSelectedPallette}
          selectedPallette={selectedPallette}
        />
      </div>
      <div className="flex gap-8 2xl:flex-row flex-col">
        <div className="flex gap-2 w-full">
          <Button className="w-full" onClick={clearScreen}>
            New
          </Button>
          <Button className="w-full" onClick={open}>
            Open
          </Button>
          <Button className="w-full" onClick={save}>
            Save
          </Button>
        </div>
        <div className="flex gap-2 w-full">
          <Button
            className="w-full"
            onClick={undo}
            disabled={screenStateUndoBufferRef.current?.length === 0}
          >
            <FontAwesomeIcon icon={faRotateLeft} />
          </Button>
          <Button
            className="w-full"
            onClick={redo}
            disabled={screenStateRedoBufferRef.current?.length === 0}
          >
            <FontAwesomeIcon icon={faRotateRight} />
          </Button>
        </div>
        <div className="flex gap-2 w-full">
          <Button className="w-full text-nowrap" onClick={exportAsPNG}>
            Export as PNG
          </Button>
          <Button className="w-full text-nowrap" onClick={exportAsASM}>
            Export as ASM
          </Button>
        </div>
        <div className="flex gap-2 w-full">
          <Button className="w-full" onClick={() => setIsHelpOpen(true)}>
            Help
          </Button>
        </div>
      </div>
      <Modal
        isOpen={error !== null}
        onClose={() => setError(null)}
        title="Oops! An error occurred"
      >
        <div>{error}</div>
      </Modal>
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

export default ScreenEditor;
