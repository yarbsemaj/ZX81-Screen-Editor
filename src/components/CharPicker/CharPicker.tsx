import charSet from "../../assets/charSet.png";
import type { PaintMode, PalletteMode } from "../Screen/ScreenEditor";
import charTool from "../../assets/tools/char.png";
import pencilTool from "../../assets/tools/pencil.png";
import textTool from "../../assets/tools/text.png";
import selectTool from "../../assets/tools/select.png";

// PaletteButton component
const ToolButton = ({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children?: React.ReactNode;
  className?: string;
}) => (
  <button
    className={`w-9 h-9 cursor-pointer hover:border-green-300 border-2 ${selected ? "border-green-400" : "border-black"} ${className || ""}`}
    onClick={onClick}
  >
    {children}
  </button>
);

const NoPalletteTools = ["character", "select"] as PaintMode[];

export const CharPicker = ({
  onSelectChar,
  selectedChar,
  onSelectMode,
  selectedMode,
  onSelectPallette,
  selectedPallette,
}: {
  onSelectChar: (charCode: number) => void;
  selectedChar: number;
  onSelectMode: (mode: PaintMode) => void;
  selectedMode: PaintMode;
  onSelectPallette: (pallette: PalletteMode) => void;
  selectedPallette: PalletteMode;
}) => {
  const charClickHandler = (charCode: number) => {
    onSelectChar(charCode);
    onSelectMode("character");
  };
  return (
    <div className="2xl:w-fit flex flex-col gap-2 w-full ">
      <div>
        <div className="2xl:grid 2xl:grid-cols-[repeat(8,36px)] flex flex-wrap gap-0.5 2xl:w-auto w-full justify-center">
          {Array.from({ length: 128 }).map((_, i) => {
            const charCode = i;
            const isSelected =
              charCode === selectedChar && selectedMode === "character";
            return (
              <div
                className={`w-9 h-9 min-w-9 min-h-9 border-2 cursor-pointer hover:border-green-300 ${isSelected ? "border-green-400" : "border-gray-700"}`}
                key={i}
              >
                <div
                  className="w-4 h-4 min-w-4 min-h-4 scale-200 origin-top-left"
                  style={{
                    backgroundImage: `url(${charSet})`,
                    backgroundPosition: `-${(charCode % 16) * 16}px -${Math.floor(charCode / 16) * 16}px`,
                    imageRendering: "pixelated",
                  }}
                  onClick={() => charClickHandler(charCode)}
                ></div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="font-mono text-lg text-center font-semibold">
          {selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Tool
        </div>
        <div className="flex gap-1 w-full justify-center">
          <ToolButton
            selected={selectedMode === "character"}
            onClick={() => onSelectMode("character")}
          >
            <img
              src={charTool}
              alt="Character Tool"
              className="w-8 h-8 m-auto image"
              style={{ imageRendering: "pixelated" }}
            />
          </ToolButton>
          <ToolButton
            className="md:block hidden"
            selected={selectedMode === "text"}
            onClick={() => onSelectMode("text")}
          >
            <img
              src={textTool}
              alt="Text Tool"
              className="w-8 h-8 m-auto image"
              style={{ imageRendering: "pixelated" }}
            />
          </ToolButton>
          <ToolButton
            selected={selectedMode === "pencil"}
            onClick={() => onSelectMode("pencil")}
          >
            <img
              src={pencilTool}
              alt="Pencil Tool"
              className="w-8 h-8 m-auto image"
              style={{ imageRendering: "pixelated" }}
            />
          </ToolButton>
          <ToolButton
            className="md:block"
            selected={selectedMode === "select"}
            onClick={() => onSelectMode("select")}
          >
            <img
              src={selectTool}
              alt="Select Tool"
              className="w-8 h-8 m-auto image"
              style={{ imageRendering: "pixelated" }}
            />
          </ToolButton>
        </div>
      </div>
      <div
        className={`${NoPalletteTools.includes(selectedMode) ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="font-mono text-lg text-center font-semibold">
          Pallette
        </div>
        <div className={`flex gap-1 w-full justify-center`}>
          <ToolButton
            className="bg-black"
            selected={
              selectedPallette === "black" &&
              !NoPalletteTools.includes(selectedMode)
            }
            onClick={() => onSelectPallette("black")}
          />
          <ToolButton
            className="bg-white"
            selected={
              selectedPallette === "white" &&
              !NoPalletteTools.includes(selectedMode)
            }
            onClick={() => onSelectPallette("white")}
          />
        </div>
      </div>
    </div>
  );
};
