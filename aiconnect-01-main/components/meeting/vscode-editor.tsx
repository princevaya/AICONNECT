"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";

const LANGUAGES = [
  { label: "JavaScript", monaco: "javascript", id: 63 },
  { label: "Python", monaco: "python", id: 71 },
  { label: "C++", monaco: "cpp", id: 54 },
  { label: "Java", monaco: "java", id: 62 },
  { label: "TypeScript", monaco: "typescript", id: 74 },
  { label: "C", monaco: "c", id: 50 },
];

type FileNode =
  | { type: "file"; content: string }
  | { type: "folder"; children: Record<string, FileNode> };

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
    },
  });

  const [activePath, setActivePath] =
    useState("main/main.js");

  const [selectedFolder, setSelectedFolder] =
    useState("main");

  const [language, setLanguage] =
    useState(LANGUAGES[0]);

  const [output, setOutput] =
    useState("Terminal ready...");


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

          setSelectedFolder(
            data.activePath.split("/")[0]
          );

          const lang =
            LANGUAGES.find(
              l => l.id === data.languageId
            );

          if (lang)
            setLanguage(lang);
        }

      } catch {}
    };

    room.on("dataReceived", handler);

    return () =>
      room.off("dataReceived", handler);

  }, [room]);


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
              language.id,
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
  FILE + FOLDER
  =================
  */

  const newFile = () => {

    const name =
      prompt("File name");

    if (!name) return;

    const newFiles: any =
      structuredClone(files);

    newFiles[selectedFolder].children[name] = {
      type: "file",
      content: "",
    };

    const path =
      `${selectedFolder}/${name}`;

    setFiles(newFiles);

    setActivePath(path);

    sync(newFiles, path);
  };


  const newFolder = () => {

    const name =
      prompt("Folder name");

    if (!name) return;

    const newFiles: any =
      structuredClone(files);

    newFiles[name] = {
      type: "folder",
      children: {},
    };

    setFiles(newFiles);

    sync(newFiles, activePath);
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
      className={`h-full flex ${
        darkMode
          ? "bg-[#1e1e1e]"
          : "bg-[#f3f3f3]"
      }`}
    >


      {/* explorer */}

      <div
        className={`w-52 border-r ${explorerBg} ${explorerBorder}`}
      >

        <div className="flex justify-between items-center p-2 text-xs">

          <span>
            EXPLORER
          </span>

          <div className="flex gap-2">

            <button onClick={newFile}>
              📄
            </button>

            <button onClick={newFolder}>
              📁
            </button>

          </div>

        </div>


        {Object.entries(files).map(
          ([name, node]: any) => (

            <div key={name}>

              <div
                onClick={() =>
                  setSelectedFolder(name)
                }
                className={`px-3 py-1 cursor-pointer ${
                  selectedFolder === name
                    ? selectedBg
                    : ""
                }`}
              >
                📁 {name}
              </div>


              {Object.keys(node.children).map(
                (file) => {

                  const path =
                    `${name}/${file}`;

                  return (

                    <div
                      key={file}
                      onClick={() =>
                        setActivePath(path)
                      }
                      className={`pl-6 py-1 cursor-pointer ${
                        activePath === path
                          ? selectedBg
                          : ""
                      }`}
                    >
                      📄 {file}
                    </div>

                  );
                }
              )}

            </div>

          )
        )}

      </div>


      {/* main */}

      <div className="flex flex-col flex-1">


        {/* top */}

        <div
          className={`flex justify-between items-center px-3 py-1 ${topbar}`}
        >

          <span>
            {activePath}
          </span>


          <div className="flex items-center gap-3">


            <button
              onClick={() =>
                setDarkMode(!darkMode)
              }
            >
              {darkMode
                ? "🌙"
                : "☀️"}
            </button>


            <select
              value={language.id}
              className={`px-2 py-1 border ${
                darkMode
                  ? "bg-[#1e1e1e] text-white border-gray-600"
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
              className="bg-[#007acc] text-white px-4 py-1 rounded hover:bg-[#005fa3]"
            >
              ▶ Run
            </button>

          </div>

        </div>


        {/* editor */}

        <div className="flex-1">

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
          />

        </div>


        {/* terminal */}

        <div
          className={`h-48 flex flex-col ${terminal}`}
        >

          <div className="flex justify-between px-3 py-1 text-xs">

            <span>
              TERMINAL
            </span>

            <button
              onClick={() =>
                setOutput("")
              }
            >
              Clear
            </button>

          </div>


          <div className="flex-1 p-3 font-mono overflow-auto">

            <pre>
              {output}
            </pre>

          </div>

        </div>

      </div>

    </div>

  );
}