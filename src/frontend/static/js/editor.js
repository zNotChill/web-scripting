
require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.35.0/min/vs" } });
let editor;

const root = document.documentElement;
const rootStyles = getComputedStyle(root);

let currentTab = ""; 

let loadedScripts = [];
let enabledLanguages = [];

function getScript(name, extension) {
  return loadedScripts.find((script) => script.name === name && script.extension === extension);
} 

function getHomeContent() {
  const notLoggedInLines = [
    `-- This means you will have limited access to the webeditor.`,
    `-- You can login in at ${window.location.origin}/api/auth/discord/login.`,
    `local permissions = {}`,
  ].join("\n");

  const loggedInLines = [
    `-- This means you will have unrestricted access to the webeditor.`,
    `local permissions = {`,
    `  "create_scripts"`,
    `  "edit_scripts"`,
    `  "delete_scripts"`,
    `}`
  ].join("\n");

  const loggedIn = Object.keys(currentUser).length > 0 ? true : false;
  return [
    `-- Welcome to the webeditor!`,
    ``,
    `-- Create a file by clicking the plus button on the sidebar`,
    `-- or by double clicking the sidebar.`,
    ``,
    `-- You can use any of the server-enabled languages.`,
    `-- This server enables the following languages:`,
    `local enabledLanguages = {`,
    enabledLanguages.map((language) => {
      let suffix = ",";

      if (enabledLanguages.indexOf(language) === enabledLanguages.length - 1) {
        suffix = ""
      }

      return `  "${language}"${suffix}`
    }),
    `}`,
    ``,
    `-- You are currently${loggedIn ? "" : " *NOT*"} logged in.`,
    `local loggedIn = ${loggedIn}`,
    ``,
    `${loggedIn ? loggedInLines : notLoggedInLines}`,
    ``,
    `-- You can re-enter this tab at any time by clicking the Home button.`
  ].join("\n");
}

document.addEventListener("DOMContentLoaded", async () => {
  const scripts = await api.getMyScripts();
  const languages = await api.getLanguages();

  enabledLanguages = languages;
  loadedScripts = scripts;

  loadedScripts.forEach((script) => {
    newFile(script.name, script.extension);
  })

  const container = document.querySelector("#container");
  container.style.width = "calc(100vw - var(--sidebar-width))";
  container.style.height = "100vh";

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
        "editor.background": hslToHex(parseHsl(rootStyles.getPropertyValue("--background").trim())),
        "editor.foreground": "#FFFFFF",
        "editor.lineHighlightBackground": "#68a7d620",
        "editor.selectionBackground": "#68a7d650",
        "editorCursor.foreground": "#B3C2FF"
      }
    })

    monaco.editor.setTheme("custom");

    editor = monaco.editor.create(document.getElementById("container"), {
      value: getHomeContent(),
      language: "lua"
    });

    window.addEventListener("resize", function() {
      editor.layout();
    });
  });
});

function setEditorModel(content, language) {
  editor.setModel(monaco.editor.createModel(content, language))
}

function toggleTab(tab) {
  try {
    document.querySelector(`.sidebar-option[data-tab="${currentTab}"]`).classList.remove("selected");
  } catch (_) {/* */}
  document.querySelector(`.sidebar-option[data-tab="${tab}"]`).classList.add("selected");

  currentTab = tab;
}

document.querySelector("#container").addEventListener("keypress", () => {
  loadedScripts[`${selectedTab.name}${selectedTab.extension}`].content = editor.getValue();
})

document.querySelector(".sidebar .sidebar-top").addEventListener("dblclick", (e) => {
  if (!e.target.classList.contains("sidebar-top")) return;
  
  newFileInput();
})

function newFile(name, extension) {
  document.querySelector(".sidebar .sidebar-top").innerHTML += `
    <div class="sidebar-option" data-tab="script-${name}-${extension}" data-name="${name}" data-ext="${extension}" onclick="setTimeout(() => { toggleTab('script-${name}-${extension}'); setEditorModel(getScript('${name}', '${extension}').content, '${extension}'); }, 50)">
      <div class="option-title">
        ${name}.${extension}
      </div>
    </div>
  `;
}

function newFileInput() {
  document.querySelector(".sidebar .sidebar-top").innerHTML += `
    <div class="sidebar-option" data-tab="script" data-type="filename_input">
      <div class="option-title">
        <input type="text" placeholder="Name">
      </div>
    </div>
  `;

  const element = document.querySelector(".sidebar .sidebar-top .sidebar-option[data-type=\"filename_input\"]");
  const input = element.querySelector("input");

  input.focus();

  async function handleKeyPress(e) {
    if (e.key === "Escape") {
      element.remove();
      cleanup();
    }

    if (e.key === "Enter") {
      const fileName = input.value;
      const lastDotIndex = fileName.lastIndexOf(".");
    
      const filename = fileName.substring(0, lastDotIndex);
      const extension = fileName.substring(lastDotIndex + 1);
      
      const result = await attemptCreateScript(filename, extension, "Begin editing...");
      
      if (result.error) {
        return;
      }
      
      element.remove();
      cleanup();
      newFile(filename, extension);
      toggleTab(`script-${name}-${extension}`);
      setEditorModel("", extension);
    }
  }

  function handleClickOutside(e) {
    if (!element.contains(e.target)) {
      element.remove();
      cleanup();
    }
  }

  function cleanup() {
    document.removeEventListener("keydown", handleKeyPress);
    document.removeEventListener("click", handleClickOutside);
  }

  document.addEventListener("keydown", handleKeyPress);
  document.addEventListener("click", handleClickOutside);
}

function newPopup(data) {
  const title = data.title;
  const content = data.content;
  const type = data.type;

  const time = Date.now()
  document.querySelector(".popups-container").innerHTML += `
    <div class="popup ${type}" data-id="${time}">
      ${title && !content ? `
        <div class="popup-content">
          ${title}
        </div>
      ` : ""}
    </div>
  `;
}

async function attemptCreateScript(name, extension, content) {
  const result = await api.createScript(name, extension, content);

  if (result.error) {
    newPopup({
      title: result.error,
      type: "error"
    });
  }
  
  loadedScripts.push({
    name: name,
    extension: extension,
    content: content
  })
  return result;
}