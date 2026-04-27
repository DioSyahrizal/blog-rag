import { useEffect, useRef } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const commands = [
  { label: "B", command: "bold" },
  { label: "I", command: "italic" },
  { label: "H2", command: "formatBlock", value: "h2" },
  { label: "UL", command: "insertUnorderedList" },
  { label: "Link", command: "createLink", prompt: "Enter URL" },
];

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  function runCommand(command: string, commandValue?: string) {
    if (command === "createLink") {
      const url = window.prompt("Enter URL");
      if (!url) {
        return;
      }
      document.execCommand(command, false, url);
    } else {
      document.execCommand(command, false, commandValue);
    }
    onChange(ref.current?.innerHTML ?? "");
  }

  return (
    <div className="editor-shell">
      <div className="toolbar" role="toolbar" aria-label="Text formatting">
        {commands.map((item) => (
          <button
            key={item.label}
            type="button"
            className="tool-button"
            onClick={() => runCommand(item.command, item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className="editor"
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
      />
    </div>
  );
}

