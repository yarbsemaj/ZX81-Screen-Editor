import React from "react";
import Modal from "./Modal";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Help">
    <div>
      <p className="mb-2 font-semibold">
        This tool allows you to create and edit artwork for display on the ZX81
        computer.
      </p>
      <ul className="list-disc mb-2 pl-4">
        <li>
          Use the &quot;Character Tool&quot; to select characters from the
          character picker on the right and then click and drag to draw on the
          screen.
        </li>
        <li>
          Use the &quot;Pencil Tool&quot; to draw using the block characters.
        </li>
        <li>
          Use the &quot;Text Tool&quot; to add text to the screen using your
          keyboard.
        </li>
        <li>
          Use the &quot;Select Tool&quot; to select, move, copy, and paste areas
          of the screen.
          <ul className="list-disc ml-4">
            <li>First click and drag to select a source area.</li>
            <li>Then click and drag again to move the destination area.</li>
            <li>
              Finally press the &quot;Enter&quot; key to copy the selected area
              to the destination.
            </li>
            <li>You can press &quot;Esc&quot; to cancel the operation.</li>
          </ul>
        </li>
        <li>
          Your creations are automatically saved in your browser&apos;s local
          storage, or you can save and load them to files using the buttons
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
);

export default HelpModal;
