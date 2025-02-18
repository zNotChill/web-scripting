
require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.35.0/min/vs" } });
let editor;

require(["vs/editor/editor.main"], function() {
  monaco.languages.register({ id: "lua" });

  monaco.editor.defineTheme("custom", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "FFFFFF", background: "000000" },
      { token: "keyword", foreground: "e06c75" },
      { token: "string", foreground: "94c173" },
      { token: "comment", foreground: "5c6370" }
    ],
    colors: {
      "editor.background": "#282c34",
      "editor.foreground": "#FFFFFF",
      "editor.lineHighlightBackground": "#68a7d620",
      "editor.selectionBackground": "#68a7d650",
      "editorCursor.foreground": "#B3C2FF"
    }
  })

  monaco.editor.setTheme("custom");

  editor = monaco.editor.create(document.getElementById("container"), {
    value: "function hi()\nend",
    language: "lua"
  });
});

// function getContent() {
//   const content = editor.getValue();
//   console.log(content);
// }

