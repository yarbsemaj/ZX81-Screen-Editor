import { faRotateLeft, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../Button/Button";

export const MenuBar = ({
  clearScreen,
  open,
  save,
  undo,
  redo,
  exportAsPNG,
  exportAsASM,
  undoEnable,
  redoEnable,
  help,
}: {
  clearScreen: () => void;
  open: () => void;
  save: () => void;
  undo: () => void;
  redo: () => void;
  exportAsPNG: () => void;
  exportAsASM: () => void;
  undoEnable: boolean;
  redoEnable: boolean;
  help: () => void;
}) => {
  return (
    <div className="flex md:gap-8 gap-2 2xl:flex-row flex-col">
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
        <Button className="w-full" onClick={undo} disabled={!undoEnable}>
          <FontAwesomeIcon icon={faRotateLeft} />
        </Button>
        <Button className="w-full" onClick={redo} disabled={!redoEnable}>
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
        <Button className="w-full" onClick={help}>
          Help
        </Button>
      </div>
    </div>
  );
};
