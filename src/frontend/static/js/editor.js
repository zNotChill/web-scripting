
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
  });

  loadData();

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

  document.querySelector("#container").addEventListener("keydown", async (e) => {
    const parsedCurrentTab = {
      name: "",
      extension: ""
    };

    const splitTab = currentTab.split("-");
    parsedCurrentTab.name = splitTab[1];
    parsedCurrentTab.extension = splitTab[2];

    const script = loadedScripts.find((script) => 
      script.name === parsedCurrentTab.name && 
      script.extension === parsedCurrentTab.extension)

    if (!script) return;

    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      await attemptUpdateScript(
        parsedCurrentTab.name, parsedCurrentTab.extension,
        parsedCurrentTab.name, parsedCurrentTab.extension, script.content
      );
      return;
    }

    script.content = editor.getValue();
    script.last_edit = Date.now();
    script.unsaved = true;
  });

  document.querySelector(".sidebar .sidebar-top").addEventListener("dblclick", (e) => {
    if (!e.target.classList.contains("sidebar-top")) return;
    
    newFileInput();
  });

  document.querySelectorAll(".sidebar .sidebar-top .sidebar-option").forEach((el) => {
    if (!el.hasAttribute("data-type")) return;

    const type = el.attributes["data-type"].value;
    const name = el.attributes["data-name"].value;
    const extension = el.attributes["data-ext"].value;
    
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();

      if (type === "script") {
        showContextMenu("script", {
          name,
          extension
        }, el)
      }
    });
  });
});

function showContextMenu(type, data, element) {
  const offset = [
    element.offsetTop,
    element.offsetWidth
  ]

  let contextMenu = document.querySelector(".context-menu");

  if (!contextMenu) {
    const contextElement = document.createElement("div");
    contextElement.classList.add("context-menu");
    document.body.appendChild(contextElement);

    contextMenu = document.querySelector(".context-menu");
  }

  contextMenu.style.opacity = 1;
  contextMenu.innerHTML = "";

  if (type === "script") {
    contextMenu.style.top = `${offset[0]}px`; 
    contextMenu.style.left = `${offset[1] + 20}px`;

    const name = document.createElement("div");
    name.classList.add("menu-option");
    name.classList.add("no-click");
    name.classList.add("no-flex");
    name.classList.add("text-wrap");
    name.innerText = `${data.name}.${data.extension}`;
    contextMenu.appendChild(name);

    const splitter = document.createElement("div");
    splitter.classList.add("menu-splitter");
    contextMenu.appendChild(splitter);
    
    const deleteOption = document.createElement("div");
    deleteOption.classList.add("menu-option");
    deleteOption.classList.add("error");
    deleteOption.classList.add("no-center");
    deleteOption.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="--darkreader-inline-fill: currentColor;" data-darkreader-inline-fill="">
        <path d="M20 6a1 1 0 0 1 .117 1.993l-.117 .007h-.081l-.919 11a3 3 0 0 1 -2.824 2.995l-.176 .005h-8c-1.598 0 -2.904 -1.249 -2.992 -2.75l-.005 -.167l-.923 -11.083h-.08a1 1 0 0 1 -.117 -1.993l.117 -.007h16z"></path>
        <path d="M14 2a2 2 0 0 1 2 2a1 1 0 0 1 -1.993 .117l-.007 -.117h-4l-.007 .117a1 1 0 0 1 -1.993 -.117a2 2 0 0 1 1.85 -1.995l.15 -.005h4z"></path>
      </svg>
      <div class="text">Delete</div>
    `;

    contextMenu.appendChild(deleteOption);

    deleteOption.addEventListener("click", async () => {
      const result = await attemptDeleteScript(data.name, data.extension);

      if (result.error) return;

      contextMenu.remove();
      removeFile(data.name, data.extension);
    })

    const saveOption = document.createElement("div");
    saveOption.classList.add("menu-option");
    saveOption.classList.add("no-center");
    saveOption.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" stroke-width="2" style="--darkreader-inline-stroke: currentColor;" data-darkreader-inline-stroke="">
        <path d="M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2"></path>
        <path d="M12 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
        <path d="M14 4l0 4l-6 0l0 -4"></path>
      </svg>
      <div class="text">Save</div>
    `;
    contextMenu.appendChild(saveOption);

    saveOption.addEventListener("click", async () => {
      const script = getScript(data.name, data.extension);
      await attemptUpdateScript(
        data.name, data.extension,
        data.name, data.extension, script.content
      );
      contextMenu.remove();
    });
  }
  
  function handleKeyPress(e) {
    if (e.key === "Escape") {
      contextMenu.remove();
      cleanup();
    }
  }

  function handleClickOutside(e) {
    if (!contextMenu.contains(e.target)) {
      contextMenu.remove();
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

function setEditorModel(content, language) {
  editor.setModel(monaco.editor.createModel(content, language));
}

function toggleTab(tab) {
  try {
    document.querySelector(`.sidebar-option[data-tab="${currentTab}"]`).classList.remove("selected");
  } catch (_) {/* */}
  document.querySelector(`.sidebar-option[data-tab="${tab}"]`).classList.add("selected");

  currentTab = tab;
}

function newFile(name, extension) {
  document.querySelector(".sidebar .sidebar-top").innerHTML += `
    <div class="sidebar-option" data-type="script" data-tab="script-${fixHTML(name)}-${fixHTML(extension)}" data-name="${fixHTML(name)}" data-ext="${fixHTML(extension)}" onclick="setTimeout(() => { toggleTab('script-${fixHTML(name)}-${fixHTML(extension)}'); setEditorModel(getScript('${fixHTML(name)}', '${fixHTML(extension)}').content, '${fixHTML(extension)}'); }, 50)">
      <div class="option-title text-wrap no-flex">
        ${name}.${extension}
      </div>
    </div>
  `;
}

function removeFile(name, extension) {
  const element = document.querySelector(`.sidebar .sidebar-top .sidebar-option[data-tab="script-${name}-${extension}"]`);
  element.remove();
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

      setTimeout(() => {
        toggleTab(`script-${filename}-${extension}`);
        setEditorModel(getScript(filename, extension).content, extension);
      }, 20);
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
    <div class="popup ${fixHTML(type || "")}" data-id="${time}">
      ${title && !content ? `
        <div class="popup-content">
          ${fixHTML(title)}
        </div>
      ` : ""}

      ${title && content ? `
        <div class="popup-title">
          ${fixHTML(title)}
        </div>
        <div class="popup-content">
          ${fixHTML(content)}
        </div>
      ` : ""}
    </div>
  `;

  setTimeout(() => {
    const element = document.querySelector(`.popups-container .popup[data-id="${time}"]`);

    element.remove();
  }, 7500);
}

async function attemptCreateScript(name, extension, content) {
  const result = await api.createScript(name, extension, content);

  if (result.error) {
    newPopup({
      title: result.error,
      type: "error"
    });
    return;
  }
  
  loadedScripts.push({
    name: name,
    extension: extension,
    content: content
  })
  return result;
}

async function attemptUpdateScript(old_name, old_extension, name, extension, content) {
  const result = await api.updateScript(old_name, old_extension, name, extension, content);

  if (result.error) {
    newPopup({
      title: result.error,
      content: result.tip,
      type: "error"
    });
    return;
  }
  
  newPopup({
    title: "Saved script.",
  });

  loadedScripts.push({
    name: name,
    extension: extension,
    content: content
  })
  return result;
}

async function attemptDeleteScript(name, extension) {
  const result = await api.deleteScript(name, extension);

  if (result.error) {
    newPopup({
      title: result.error,
      type: "error"
    });
    return;
  }
  
  loadedScripts = loadedScripts.filter(script => 
    !(script.name === name && script.extension === extension)
  );

  return result;
}

function loadData() {
  const localScripts = JSON.parse(localStorage.getItem("local_scripts"));

  loadedScripts.forEach((script) => {
    const localScript = localScripts.find((ls) => 
      ls.name === script.name &&
      ls.extension === script.extension
    );
    const loadedScript = loadedScripts.find((ls) => 
      ls.name === script.name &&
      ls.extension === script.extension
    );

    // We should load the user's local version of the script
    // since it is newer than the old script
    if (localScript.last_edit > script.last_edit) {
      loadedScript.content = localScript.content;
      loadedScript.last_edit = localScript.last_edit;
      loadedScript.unsaved = localScript.unsaved;
    }
  })
}

function saveData() {
  localStorage.setItem("local_scripts", JSON.stringify(loadedScripts));
}

setInterval(() => {
  saveData();
}, 2000);