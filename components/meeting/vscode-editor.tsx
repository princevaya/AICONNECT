"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";

const LANGUAGES = [
  { label: "JavaScript", monaco: "javascript", id: 63, runId: 63, ext: ".js" },
  { label: "Python", monaco: "python", id: 71, runId: 92, ext: ".py" },
  { label: "C++", monaco: "cpp", id: 54, runId: 54, ext: ".cpp" },
  { label: "Java", monaco: "java", id: 62, runId: 62, ext: ".java" },
  { label: "TypeScript", monaco: "typescript", id: 74, runId: 74, ext: ".ts" },
  { label: "C", monaco: "c", id: 50, runId: 50, ext: ".c" },
  { label: "HTML", monaco: "html", id: 60, runId: 60, ext: ".html" },
  { label: "CSS", monaco: "css", id: 55, runId: 55, ext: ".css" },
  { label: "React (JSX)", monaco: "javascript", id: 101, runId: 63, ext: ".jsx" },
];

type FileNode =
  | { type: "file"; content: string }
  | { type: "folder"; children: Record<string, FileNode>; expanded?: boolean };

export default function VSCodeEditor({
  room,
  roomId,
}: {
  room: any;
  roomId: string;
}) {

  const [darkMode, setDarkMode] = useState(true);

  const [files, setFiles] = useState<Record<string, FileNode>>({
    main: {
      type: "folder",
      children: {
        "main.js": {
          type: "file",
          content: "// Start coding...",
        },
      },
      expanded: true,
    },
  });

  const [activePath, setActivePath] =
    useState("main/main.js");

  const [openTabs, setOpenTabs] =
    useState<string[]>(["main/main.js"]);

  const [expandedFolders, setExpandedFolders] =
    useState<Record<string, boolean>>({ main: true });

  const [language, setLanguage] =
    useState(LANGUAGES[0]);

  const [output, setOutput] =
    useState("Terminal ready...");

  const [showPreview, setShowPreview] =
    useState(false);

  const [previewHTML, setPreviewHTML] =
    useState("");

  const [editorLine, setEditorLine] = useState(1);
  const [editorCol, setEditorCol] = useState(1);


  /*
  =================
  DETECT LANGUAGE BY FILE EXT
  =================
  */

  const detectLanguage = (filePath: string) => {
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const lang = LANGUAGES.find(l => l.ext === ext) || LANGUAGES[0];
    setLanguage(lang);
    return lang;
  };


  /*
  =================
  GET CONTENT
  =================
  */

  const getContent = (path: string) => {

    const parts = path.split("/");

    let current: any = files;

    for (const part of parts)
      current =
        current[part]?.children ||
        current[part];

    return current?.content || "";
  };

  const code = getContent(activePath);


  /*
  =================
  SET CONTENT
  =================
  */

  const setContent = (
    path: string,
    value: string
  ) => {

    const parts = path.split("/");

    const newFiles: any =
      structuredClone(files);

    let current = newFiles;

    for (let i = 0; i < parts.length; i++) {

      const part = parts[i];

      if (i === parts.length - 1)
        current[part].content = value;
      else
        current =
          current[part].children;
    }

    setFiles(newFiles);

    sync(newFiles, path);
  };


  /*
  =================
  REALTIME
  =================
  */

  useEffect(() => {

    if (!room) return;

    const handler = (payload: Uint8Array) => {

      try {

        const data = JSON.parse(
          new TextDecoder().decode(payload)
        );

        if (data.type === "code-sync") {

          setFiles(data.files);

          setActivePath(data.activePath);

          if (!openTabs.includes(data.activePath)) {
            setOpenTabs([...openTabs, data.activePath]);
          }

          const lang = detectLanguage(data.activePath);
        }

      } catch {}
    };

    room.on("dataReceived", handler);

    return () =>
      room.off("dataReceived", handler);

  }, [room, openTabs]);


  const sync = async (
    newFiles: any,
    path: string,
    lang = language
  ) => {

    if (!room) return;

    await room.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({
          type: "code-sync",
          files: newFiles,
          activePath: path,
          languageId: lang.id,
        })
      )
    );
  };


  /*
  =================
  RUN
  =================
  */

  const runCode = async () => {

    // If editing HTML file, show browser preview instead
    if (activePath.endsWith(".html")) {
      await previewWeb();
      return;
    }

    setOutput("Running...");

    try {

      const res = await fetch(
        "/api/code/execute",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            code,
            language_id:
              language.runId || language.id,
          }),
        }
      );

      const data =
        await res.json();

      setOutput(
        data.output ||
          "No output"
      );

    }
    catch {
      setOutput(
        "Execution failed"
      );
    }
  };


  /*
  =================
  PREVIEW WEB
  =================
  */

  const previewWeb = async () => {

    setShowPreview(false);

    try {

      // Extract HTML, CSS, JS from files
      const htmlFile = Object.values(files)
        .flatMap((folder: any) =>
          Object.entries(folder.children || {})
            .filter(([name]: any) =>
              name.endsWith(".html")
            )
            .map(([, node]: any) =>
              node.content
            )
        )[0] || "";

      const cssFile = Object.values(files)
        .flatMap((folder: any) =>
          Object.entries(folder.children || {})
            .filter(([name]: any) =>
              name.endsWith(".css")
            )
            .map(([, node]: any) =>
              node.content
            )
        )[0] || "";

      const jsFile = Object.values(files)
        .flatMap((folder: any) =>
          Object.entries(folder.children || {})
            .filter(([name]: any) =>
              name.endsWith(".js")
            )
            .map(([, node]: any) =>
              node.content
            )
        )[0] || "";

      const res = await fetch(
        "/api/code/preview",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            html: htmlFile,
            css: cssFile,
            javascript: jsFile,
          }),
        }
      );

      const data =
        await res.json();

      if (data.success) {
        setPreviewHTML(data.html);
        setShowPreview(true);
      }

    } catch {
      setOutput(
        "Preview failed"
      );
    }
  };


  /*
  =================
  FILE + FOLDER
  =================
  */

  const newFile = () => {

    const name =
      prompt("File name (e.g., app.js)");

    if (!name) return;

    const newFiles: any =
      structuredClone(files);

    const firstFolder = Object.keys(newFiles)[0];

    if (!newFiles[firstFolder].children[name]) {
      newFiles[firstFolder].children[name] = {
        type: "file",
        content: "",
      };

      const path = `${firstFolder}/${name}`;

      setFiles(newFiles);
      setActivePath(path);

      if (!openTabs.includes(path)) {
        setOpenTabs([...openTabs, path]);
      }

      detectLanguage(path);

      sync(newFiles, path);
    }
  };


  const newFolder = () => {

    const name =
      prompt("Folder name");

    if (!name) return;

    const newFiles: any =
      structuredClone(files);

    if (!newFiles[name]) {
      newFiles[name] = {
        type: "folder",
        children: {},
        expanded: true,
      };

      setFiles(newFiles);
      setExpandedFolders({
        ...expandedFolders,
        [name]: true,
      });

      sync(newFiles, activePath);
    }
  };

  const toggleFolder = (folderName: string) => {
    setExpandedFolders({
      ...expandedFolders,
      [folderName]: !expandedFolders[folderName],
    });
  };

  const closeTab = (path: string) => {
    const newTabs = openTabs.filter(t => t !== path);
    setOpenTabs(newTabs);
    if (activePath === path && newTabs.length > 0) {
      setActivePath(newTabs[0]);
      detectLanguage(newTabs[0]);
    }
  };


  /*
  =================
  COLORS
  =================
  */

  const explorerBg =
    darkMode
      ? "bg-[#252526] text-white"
      : "bg-white text-black";

  const explorerBorder =
    darkMode
      ? "border-[#333]"
      : "border-gray-300";

  const selectedBg =
    darkMode
      ? "bg-[#37373d]"
      : "bg-gray-200";

  const topbar =
    darkMode
      ? "bg-[#323233] text-white"
      : "bg-gray-200 text-black";

  const terminal =
    darkMode
      ? "bg-black text-green-400"
      : "bg-white text-black border-t";


  /*
  =================
  UI
  =================
  */

  return (

    <div
      className={`h-full flex flex-col ${
        darkMode
          ? "bg-[#1e1e1e]"
          : "bg-[#f3f3f3]"
      }`}
    >


      {/* main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* explorer */}
        <div
          className={`w-52 border-r flex flex-col ${explorerBg} ${explorerBorder}`}
        >

          <div className="flex justify-between items-center p-3 text-xs font-semibold border-b" style={{borderColor: explorerBorder}}>

            <span>EXPLORER</span>

            <div className="flex gap-1">
              <button
                onClick={newFile}
                title="New File"
                className="p-1 hover:opacity-70"
              >
                📄
              </button>
              <button
                onClick={newFolder}
                title="New Folder"
                className="p-1 hover:opacity-70"
              >
                📁
              </button>
            </div>

          </div>

          <div className="flex-1 overflow-auto">
            {Object.entries(files).map(
              ([name, node]: any) => (

                <div key={name}>

                  <div
                    onClick={() =>
                      toggleFolder(name)
                    }
                    className={`px-3 py-2 cursor-pointer hover:opacity-80 text-sm flex items-center gap-2 ${
                      expandedFolders[name] ? selectedBg : ""
                    }`}
                  >
                    <span>{expandedFolders[name] ? "▼" : "▶"}</span>
                    <span>📁</span>
                    <span className="truncate">{name}</span>
                  </div>

                  {expandedFolders[name] &&
                    Object.keys(node.children).map(
                      (file) => {

                        const path =
                          `${name}/${file}`;

                        const isActive = activePath === path;

                        return (

                          <div
                            key={file}
                            onClick={() => {
                              setActivePath(path);
                              if (!openTabs.includes(path)) {
                                setOpenTabs([...openTabs, path]);
                              }
                              detectLanguage(path);
                            }}
                            className={`pl-8 py-2 cursor-pointer hover:opacity-80 text-sm flex items-center gap-2 truncate ${
                              isActive
                                ? selectedBg
                                : ""
                            }`}
                          >
                            <span>📄</span>
                            <span className="truncate">{file}</span>
                          </div>

                        );
                      }
                    )}

                </div>

              )
            )}
          </div>

        </div>


        {/* main editor area */}

        <div className="flex flex-col flex-1">


          {/* tabs */}

          <div
            className={`flex items-center border-b ${topbar}`}
            style={{borderColor: explorerBorder}}
          >
            {openTabs.map((path) => (
              <div
                key={path}
                onClick={() => {
                  setActivePath(path);
                  detectLanguage(path);
                }}
                className={`flex items-center gap-2 px-3 py-2 border-r cursor-pointer text-sm whitespace-nowrap hover:opacity-80 ${
                  activePath === path
                    ? darkMode ? "bg-[#1e1e1e] border-b-2 border-blue-400" : "bg-white border-b-2 border-blue-500"
                    : darkMode ? "bg-[#252526]" : "bg-gray-100"
                }`}
                style={{borderRightColor: explorerBorder}}
              >
                <span>📄</span>
                <span>{path.split('/').pop()}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(path);
                  }}
                  className="ml-1 px-1 hover:opacity-70"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>


          {/* top toolbar */}

          <div
            className={`flex justify-between items-center px-4 py-2 ${topbar}`}
          >

            <span className="text-xs">
              {activePath}
            </span>


            <div className="flex items-center gap-2">

              <select
                value={language.id}
                className={`px-2 py-1 text-sm border rounded ${
                  darkMode
                    ? "bg-[#3c3c3c] text-white border-gray-600"
                    : "bg-white text-black border-gray-400"
                }`}
                onChange={(e) => {

                  const lang =
                    LANGUAGES.find(
                      l =>
                        l.id === Number(
                          e.target.value
                        )
                    )!;

                  setLanguage(lang);

                  sync(
                    files,
                    activePath,
                    lang
                  );
                }}
              >

                {LANGUAGES.map((l) => (

                  <option
                    key={l.id}
                    value={l.id}
                  >
                    {l.label}
                  </option>

                ))}

              </select>

              <button
                onClick={runCode}
                className="bg-[#007acc] text-white px-4 py-1 text-sm rounded hover:bg-[#005fa3]"
              >
                ▶ Run
              </button>

              <button
                onClick={previewWeb}
                className="bg-[#17a2b8] text-white px-4 py-1 text-sm rounded hover:bg-[#138496]"
              >
                🌐 Preview
              </button>

              <button
                onClick={() =>
                  setDarkMode(!darkMode)
                }
                className="px-2 py-1 text-sm"
              >
                {darkMode ? "☀️" : "🌙"}
              </button>

            </div>

          </div>


          {/* editor */}

          <div className="flex-1 relative">

            <Editor
              theme={
                darkMode
                  ? "vs-dark"
                  : "light"
              }
              language={
                language.monaco
              }
              value={code}
              onChange={(v) =>
                setContent(
                  activePath,
                  v || ""
                )
              }
              onMount={(editor) => {
                editor.onDidChangeCursorPosition((e) => {
                  setEditorLine(e.position.lineNumber);
                  setEditorCol(e.position.column);
                });
              }}
            />

            {/* status bar */}
            <div className={`absolute bottom-0 right-0 px-3 py-1 text-xs ${topbar} border-t`} style={{borderColor: explorerBorder}}>
              Ln {editorLine}, Col {editorCol}
            </div>

          </div>


          {/* terminal */}

          <div
            className={`h-48 flex flex-col border-t ${terminal}`}
            style={{borderColor: explorerBorder}}
          >

            <div className="flex justify-between px-4 py-2 text-xs font-semibold border-b" style={{borderColor: explorerBorder}}>

              <span>
                TERMINAL
              </span>

              <button
                onClick={() =>
                  setOutput("Terminal ready...")
                }
                className="hover:opacity-70"
              >
                Clear
              </button>

            </div>


            <div className="flex-1 p-4 font-mono overflow-auto text-sm">

              <pre>
                {output}
              </pre>

            </div>

          </div>

        </div>

      </div>

      {/* Preview Modal - Browser */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl h-5/6 rounded-lg overflow-hidden flex flex-col shadow-2xl ${
            darkMode
              ? "bg-[#1e1e1e]"
              : "bg-white"
          }`}>
            {/* Browser Header */}
            <div className={`flex justify-between items-center px-4 py-2 border-b ${
              darkMode
                ? "bg-[#323233] border-gray-700"
                : "bg-gray-200 border-gray-300"
            }`}>
              <div className="flex items-center gap-3">
                <button className={`px-2 py-1 rounded text-sm ${
                  darkMode
                    ? "bg-[#424242] text-gray-400 hover:text-white"
                    : "bg-gray-300 text-gray-600 hover:text-black"
                }`}>← </button>
                <button className={`px-2 py-1 rounded text-sm ${
                  darkMode
                    ? "bg-[#424242] text-gray-400 hover:text-white"
                    : "bg-gray-300 text-gray-600 hover:text-black"
                }`}>→ </button>
                <div className={`px-3 py-1 rounded text-sm flex-1 max-w-sm ${
                  darkMode
                    ? "bg-[#3c3c3c] text-[#00d4ff] border border-gray-600"
                    : "bg-white text-gray-700 border border-gray-400"
                }`}>
                  localhost:3000
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className={`text-xl px-2 hover:opacity-70 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                ✕
              </button>
            </div>
            
            {/* Browser Content */}
            <iframe
              srcDoc={previewHTML}
              className="flex-1 border-0 w-full"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}

    </div>

  );
}
