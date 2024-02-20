
import { useEffect } from "react";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export const Tiptap = ({ content }: { content: string }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || "",
  });

  useEffect(() => {
    editor?.commands.setContent(content);
  }, [content]);

  return (
    <div className="max-h-64 w-full overflow-y-scroll rounded-md border border-gray-300">
      <EditorContent editor={editor} className="m-2 w-full" />
    </div>
  );
};
