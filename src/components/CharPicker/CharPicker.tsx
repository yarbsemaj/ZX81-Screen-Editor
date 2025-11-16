import charSet from "../../assets/charSet.png";
import type { PaintMode } from "../Screen/ScreenEditor";

export const CharPicker = ({
  onSelectChar,
  selectedChar,
  onSelectMode,
  selectedMode,
}: {
  onSelectChar: (charCode: number) => void;
  selectedChar: number;
  onSelectMode: (mode: PaintMode) => void;
  selectedMode: PaintMode;
}) => {
  const charClickHandler = (charCode: number) => {
    onSelectChar(charCode);
    onSelectMode("char");
  };
  return (
    <div className="w-fit flex flex-col gap-4">
      <div>
        <h1 className="font-mono text-3xl font-bold text-center w-full">ZX81 Screen Editor</h1>
      </div>
      <div>
        <div className="grid grid-cols-8 w-fit gap-0.5">
          {Array.from({ length: 128 }).map((_, i) => {
            const charCode = i;
            const isSelected =
              charCode === selectedChar && selectedMode === "char";
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
        <div className="w-full text-center font-mono text-lg font-semibold">
          Painting Mode
        </div>
        <div className="flex gap-0.5 w-full justify-center">
          <button
            className={`w-9 h-9 cursor-pointer bg-black hover:border-green-300 border-2 ${selectedMode === "black" ? "border-green-400" : "border-black"}`}
            onClick={() => onSelectMode("black")}
          />
          <button
            className={`w-9 h-9 cursor-pointer bg-white hover:border-green-300 border-2 ${selectedMode === "white" ? "border-green-400" : "border-black"}`}
            onClick={() => onSelectMode("white")}
          />
        </div>
      </div>
    </div>
  );
};
