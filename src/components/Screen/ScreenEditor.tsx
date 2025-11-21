import React, { useEffect, useReducer, useRef, useState } from "react";
import { CharPicker } from "../CharPicker/CharPicker";
import charSet from "../../assets/charSet.png";
import {
  calculateCharForPixelDrawing,
  calculateRenderedScreenScale,
  keyboardEventToChar,
  mouseEventToCoordinates,
  persistState,
  pushToUndoBuffer,
} from "./utils/utils";
import { redrawScreen as redrawScreenUtil } from "./utils/redrawScreen";
import { pasteSelection as pasteSelectionUtil } from "./utils/pasteSelection";
import Button from "../Button/Button";
import Modal from "../Modal/Modal";
import HelpModal from "../Modal/HelpModal";
import initialScreenState from "../../assets/initialScreenState.json";
import {
  saveScreenState,
  exportScreenAsPNG,
  exportScreenAsASM,
  openScreenFile,
} from "./utils/file";
import { MenuBar } from "../MenuBar/MenuBar";

export type PaintMode = "pencil" | "character" | "text" | "select";
export type PalletteMode = "black" | "white";

export const SCREEN_SCALE = 1; // Scale factor for the screen display
export const CHAR_SIZE = 16; // Size of each character in pixels
export const SCREEN_WIDTH = 32; // Number of characters horizontally
export const SCREEN_HEIGHT = 24; // Number of characters vertically
export const SCREEN_HEIGHT_PIXELS = SCREEN_HEIGHT * CHAR_SIZE * SCREEN_SCALE;
export const SCREEN_WIDTH_PIXELS = SCREEN_WIDTH * CHAR_SIZE * SCREEN_SCALE;

const ScreenEditor: React.FC = () => {
  const [selectedChar, setSelectedChar] = useState<number>(1);
  const [selectedMode, setSelectedMode] = useState<PaintMode>("character");
  const [selectedPallette, setSelectedPallette] =
    useState<PalletteMode>("black");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const canvasCTXRef = useRef<CanvasRenderingContext2D | null>(null);
  const [renderedScreenScale, setRenderedScreenScale] = useState<number>(
    calculateRenderedScreenScale(window.innerWidth),
  );

  useEffect(() => {
    const handleResize = () => {
      setRenderedScreenScale(calculateRenderedScreenScale(window.innerWidth));
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  const charSetImage = React.useMemo(() => {
    const img = new window.Image();
    img.src = charSet;
    img.onload = () => {
      redrawScreen();
    };
    return img;
  }, []);

  const clearScreen = () => {
    pushToUndoBuffer(
      screenStateUndoBufferRef,
      screenStateRedoBufferRef,
      screenStateRef,
      forceUpdate,
    );
    screenStateRef.current.fill(0);
    persistState(screenStateRef);
    redrawScreen();
  };
  const screenStateRef = useRef<Uint8Array>(
    window.localStorage.getItem("screenState")
      ? new Uint8Array(
          JSON.parse(window.localStorage.getItem("screenState") as string),
        )
      : new Uint8Array(initialScreenState),
  ); // Empty screen state

  const screenStateUndoBufferRef = useRef<Uint8Array[] | null>([]);
  const screenStateRedoBufferRef = useRef<Uint8Array[] | null>([]);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const charPositionsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const selectToolRef = useRef<{
    source: { x: number; y: number; width: number; height: number };
    destination?: { x: number; y: number };
    copyBuffer?: Uint8Array;
  } | null>(null);

  const save = () => saveScreenState(screenStateRef);
  const exportAsPNG = () =>
    exportScreenAsPNG(canvasRef as React.RefObject<HTMLCanvasElement>);
  const exportAsASM = () => exportScreenAsASM(screenStateRef);
  const open = () =>
    openScreenFile(
      setError,
      screenStateRef,
      forceUpdate,
      pushToUndoBuffer,
      redrawScreen,
      persistState,
      screenStateUndoBufferRef,
      screenStateRedoBufferRef,
    );

  const undo = () => {
    const undoBuffer = screenStateUndoBufferRef.current;
    if (undoBuffer && undoBuffer.length > 0) {
      const previousState = undoBuffer.pop();
      if (previousState) {
        screenStateRedoBufferRef.current?.push(
          new Uint8Array([...screenStateRef.current]),
        );
        screenStateRef.current = previousState;
        persistState(screenStateRef);
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
        persistState(screenStateRef);
        redrawScreen();
        forceUpdate();
      }
    }
  };

  const redrawScreen = () =>
    redrawScreenUtil(
      canvasCTXRef.current,
      canvasRef.current,
      screenStateRef.current,
      charSetImage,
      selectedMode,
      charPositionsRef.current,
      selectToolRef.current,
    );

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
          pushToUndoBuffer(
            screenStateUndoBufferRef,
            screenStateRedoBufferRef,
            screenStateRef,
            forceUpdate,
          );
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
          persistState(screenStateRef);
          redrawScreen();
          e.preventDefault();
        }
      } else if (selectedMode === "select") {
        // Handle select mode key events here
        if (e.key === "Escape") {
          // Cancel selection
          selectToolRef.current = null;
          redrawScreen();
          forceUpdate();
          e.preventDefault();
        } else if (
          e.key === "Enter" &&
          selectToolRef.current?.destination &&
          selectToolRef.current?.copyBuffer
        ) {
          pasteSelection();
          e.preventDefault();
        }
      }
    };

    return () => {
      document.onkeydown = null;
    };
  }, [selectedMode, selectedPallette]);

  const pasteSelection = () =>
    pasteSelectionUtil(
      selectToolRef,
      screenStateUndoBufferRef,
      screenStateRedoBufferRef,
      screenStateRef,
      forceUpdate,
      redrawScreen,
    );

  useEffect(() => {
    selectToolRef.current = null;
    redrawScreen();
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
          forceUpdate();
        }
        redrawScreen();
      } else if (selectedMode !== "text") {
        pushToUndoBuffer(
          screenStateUndoBufferRef,
          screenStateRedoBufferRef,
          screenStateRef,
          forceUpdate,
        );
        persistState(screenStateRef);
      }
    };

    const onmousemove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
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
      persistState(screenStateRef);
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
      <div className="flex 2xl:items-start items-center 2xl:flex-row flex-col gap-4">
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
        {selectedMode === "select" &&
        selectToolRef.current?.destination?.x &&
        selectToolRef.current?.destination?.y &&
        selectToolRef.current?.copyBuffer ? (
          <div className="md:hidden flex flex-col gap-2 w-full">
            <Button className="w-full" onClick={pasteSelection}>
              Paste
            </Button>
          </div>
        ) : null}
        <CharPicker
          onSelectChar={setSelectedChar}
          selectedChar={selectedChar}
          onSelectMode={setSelectedMode}
          selectedMode={selectedMode}
          onSelectPallette={setSelectedPallette}
          selectedPallette={selectedPallette}
        />
      </div>
      <MenuBar
        clearScreen={clearScreen}
        open={open}
        save={save}
        undo={undo}
        redo={redo}
        exportAsPNG={exportAsPNG}
        exportAsASM={exportAsASM}
        undoEnable={!!screenStateUndoBufferRef.current?.length}
        redoEnable={!!screenStateRedoBufferRef.current?.length}
        help={() => setIsHelpOpen(true)}
      />
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
