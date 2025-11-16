import React, { useEffect, useRef, useState } from "react";
import { CharPicker } from "../CharPicker/CharPicker";
import charSet from "../../assets/charSet.png";
import { calculateCharForPixelDrawing, downLoadBlob } from "./utils";
import Button from "../Button/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateLeft, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import Modal from "../Modal/Modal";

interface ScreenEditorProps {}

export type PaintMode = "black" | "white" | "char";

const SCREEN_SCALE = 1; // Scale factor for the screen display
const RENDERED_SCREEN_SCALE = 2; // Scale factor for the rendered screen image
const CHAR_SIZE = 16; // Size of each character in pixels
const SCREEN_WIDTH = 32; // Number of characters horizontally
const SCREEN_HEIGHT = 24; // Number of characters vertically
const SCREEN_HEIGHT_PIXELS = SCREEN_HEIGHT * CHAR_SIZE * SCREEN_SCALE;
const SCREEN_WIDTH_PIXELS = SCREEN_WIDTH * CHAR_SIZE * SCREEN_SCALE;

const ScreenEditor: React.FC<ScreenEditorProps> = () => {
  const [selectedChar, setSelectedChar] = useState<number>(0);
  const [selectedMode, setSelectedMode] = useState<PaintMode>("char");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const canvasCTXRef = useRef<CanvasRenderingContext2D | null>(null);
  const screenStateRef = useRef<Uint8Array>(
    window.localStorage.getItem("screenState")
      ? new Uint8Array(
          JSON.parse(window.localStorage.getItem("screenState") as string),
        )
      : new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT),
  ); // Empty screen state

  const screenStateUndoBufferRef = useRef<Uint8Array[] | null>([]);
  const screenStateRedoBufferRef = useRef<Uint8Array[] | null>([]);

  const charSetImage = new Image();
  charSetImage.src = charSet;
  charSetImage.onload = () => {
    redrawScreen();
  };

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
          screenStateRef.current = array;
          redrawScreen();
          persistState();
          pushToUndoBuffer();
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
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvasCTXRef.current = ctx;

    // Initialize undo buffer with the current state
    pushToUndoBuffer();

    document.onkeydown = (e) => {
      if (e.ctrlKey && e.key === "z") {
        undo();
      }
    };

    return () => {
      document.onkeydown = null;
    };
  }, []);

  useEffect(() => {
    let isMouseDown = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvasCTXRef.current;
    if (!ctx) return;

    canvas.onmouseup = () => {
      isMouseDown = false;
    };
    canvas.onmouseleave = () => {
      isMouseDown = false;
    };
    canvas.onmousedown = () => {
      // Save current state to undo buffer
      pushToUndoBuffer();
      isMouseDown = true;
    };

    canvas.onmousemove = (e) => {
      if (isMouseDown) {
        draw(e);
      }
    };
    canvas.onclick = (e) => {
      draw(e);
    };

    const draw = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / RENDERED_SCREEN_SCALE;
      const y = (e.clientY - rect.top) / RENDERED_SCREEN_SCALE;

      //Get the char and quadrant from x,y (For the Pixel Drawing Mode)
      const charX = Math.floor(x / (CHAR_SIZE * SCREEN_SCALE));
      const charY = Math.floor(y / (CHAR_SIZE * SCREEN_SCALE));
      const charIndex = charY * 32 + charX;
      const quadrantX = Math.floor(
        (x % (CHAR_SIZE * SCREEN_SCALE)) / ((CHAR_SIZE * SCREEN_SCALE) / 2),
      );
      const quadrantY = Math.floor(
        (y % (CHAR_SIZE * SCREEN_SCALE)) / ((CHAR_SIZE * SCREEN_SCALE) / 2),
      );
      if (selectedMode === "char") {
        // Draw character at the clicked position
        screenStateRef.current[charIndex] = selectedChar;
      } else if (selectedMode === "black") {
        screenStateRef.current[charIndex] = calculateCharForPixelDrawing(
          quadrantX,
          quadrantY,
          screenStateRef.current[charIndex],
          false,
        );
      } else if (selectedMode === "white") {
        screenStateRef.current[charIndex] = calculateCharForPixelDrawing(
          quadrantX,
          quadrantY,
          screenStateRef.current[charIndex],
          true,
        );
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
    };
  }, [selectedMode, selectedChar]);

  return (
    <div className="w-screen flex items-center flex-col gap-4 h-screen justify-center">
      <div className="flex flex-row gap-4">
        <div className="boarder border-2 border-black">
          <canvas
            style={{
              width: SCREEN_WIDTH_PIXELS * RENDERED_SCREEN_SCALE + "px",
              height: SCREEN_HEIGHT_PIXELS * RENDERED_SCREEN_SCALE + "px",
              imageRendering: "pixelated",
            }}
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
        />
      </div>
      <div className="flex gap-8 flex-row">
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
          <Button className="w-full" onClick={undo}>
            <FontAwesomeIcon icon={faRotateLeft} />
          </Button>
          <Button className="w-full" onClick={redo}>
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
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Help"
      >
        <div>
          <p className="mb-2 font-semibold">
            This tool allows you to create and edit artwork for display on the
            ZX81 computer.
          </p>
          <ul className="list-disc list-inside mb-2">
            <li>
              Select characters from the character picker on the right and then
              click and drag to draw on the screen.
            </li>
            <li>Use the "Painting Mode" to draw using the block character.</li>
            <li>
              Your creations are automatically saved in your browser's local
              storage, or you can save and load then to files using the buttons
              below the editor window.
            </li>
            <li>
              Export your creations as PNG images or ASM code for use in your
              projects.
            </li>
          </ul>
          <p className="flex gap-4">
            <a
              className="underline"
              target="_blank"
              href="https://github.com/yarbsemaj/ZX81-Screen-Editor"
              rel="noreferrer"
            >
              Github
            </a>
            <a
              className="underline"
              target="_blank"
              href="https://www.yarbsemaj.com"
              rel="noreferrer"
            >
              Author
            </a>
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ScreenEditor;
