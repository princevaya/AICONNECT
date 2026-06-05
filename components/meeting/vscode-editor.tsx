"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useMemo, useState } from "react";
import type { Room } from "livekit-client";

const LANGUAGES = [
  { label: "JavaScript", monaco: "javascript", id: 63 },
  { label: "Python", monaco: "python", id: 71 },
  { label: "C++", monaco: "cpp", id: 54 },
  { label: "Java", monaco: "java", id: 62 },
  { label: "TypeScript", monaco: "typescript", id: 74 },
  { label: "C", monaco: "c", id: 50 },
] as const;

type LanguageOption = (typeof LANGUAGES)[number];

type FileNode =
  | { type: "file"; content: string }
  | { type: "folder"; children: Record<string, FileNode> };

type FilesTree = Record<string, FileNode>;

type RoomLike = Pick<Room, "on" | "off" | "localParticipant">;

function isFolderNode(node: FileNode | undefined): node is { type: "folder"; children: Record<string, FileNode> } {
  return Boolean(node && node.type === "folder");
}

function isFileNode(node: FileNode | undefined): node is { type: "file"; content: string } {
  return Boolean(node && node.type === "file");
}

function cloneFiles(files: FilesTree) {
  return structuredClone(files) as FilesTree;
}

export default function VSCodeEditor({
  room,
  roomId,
}: {
  room: RoomLike | null;
  roomId: string;
}) {
  const [darkMode, setDarkMode] = useState(true);
  const [files, setFiles] = useState<FilesTree>({
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
  const [activePath, setActivePath] = useState("main/main.js");
  const [selectedFolder, setSelectedFolder] = useState("main");
  const [language, setLanguage] = useState<LanguageOption>(LANGUAGES[0]);
  const [output, setOutput] = useState("Terminal ready...");

  const code = useMemo(() => {
    const parts = activePath.split("/");
    let nodeMap: FilesTree = files;
    for (let i = 0; i < parts.length; i += 1) {
      const node = nodeMap[parts[i]];
      if (!node) return "";
      if (i === parts.length - 1) return isFileNode(node) ? node.content : "";
      if (!isFolderNode(node)) return "";
      nodeMap = node.children;
    }
    return "";
  }, [activePath, files]);

  const setContent = (path: string, value: string) => {
    const parts = path.split("/");
    const nextFiles = cloneFiles(files);
    let nodeMap: FilesTree = nextFiles;

    for (let i = 0; i < parts.length; i += 1) {
      const key = parts[i];
      const node = nodeMap[key];
      if (!node) return;
      if (i === parts.length - 1) {
        if (!isFileNode(node)) return;
        node.content = value;
        setFiles(nextFiles);
        sync(nextFiles, path);
        return;
      }
      if (!isFolderNode(node)) return;
      nodeMap = node.children;
    }
  };

  useEffect(() => {
    if (!room) return;

    const handler = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload)) as {
          type?: string;
          files?: FilesTree;
          activePath?: string;
          languageId?: number;
        };
        if (data.type !== "code-sync" || !data.files || !data.activePath) return;
        setFiles(data.files);
        setActivePath(data.activePath);
        setSelectedFolder(data.activePath.split("/")[0] || "main");
        const lang = LANGUAGES.find((item) => item.id === data.languageId);
        if (lang) setLanguage(lang);
      } catch {
        // Ignore malformed realtime payloads.
      }
    };

    room.on?.("dataReceived", handler);
    return () => {
      room.off?.("dataReceived", handler);
    };
  }, [room]);

  const sync = async (nextFiles: FilesTree, path: string, lang: LanguageOption = language) => {
    if (!room?.localParticipant?.publishData) return;
    await room.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({
          type: "code-sync",
          files: nextFiles,
          activePath: path,
          languageId: lang.id,
        })
      )
    );
  };

  const runCode = async () => {
    setOutput("Running...");
    try {
      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language_id: language.id,
        }),
      });
      const data = (await res.json()) as { output?: string };
      setOutput(data.output || "No output");
    } catch {
      setOutput("Execution failed");
    }
  };

  const newFile = () => {
    const name = prompt("File name")?.trim();
    if (!name) return;
    const nextFiles = cloneFiles(files);
    const folder = nextFiles[selectedFolder];
    if (!isFolderNode(folder)) return;
    folder.children[name] = { type: "file", content: "" };
    const nextPath = `${selectedFolder}/${name}`;
    setFiles(nextFiles);
    setActivePath(nextPath);
    void sync(nextFiles, nextPath);
  };

  const newFolder = () => {
    const name = prompt("Folder name")?.trim();
    if (!name) return;
    const nextFiles = cloneFiles(files);
    nextFiles[name] = { type: "folder", children: {} };
    setFiles(nextFiles);
    void sync(nextFiles, activePath);
  };

  const explorerBg = darkMode ? "bg-[#252526] text-white" : "bg-white text-black";
  const explorerBorder = darkMode ? "border-[#333]" : "border-gray-300";
  const selectedBg = darkMode ? "bg-[#37373d]" : "bg-gray-200";
  const topbar = darkMode ? "bg-[#323233] text-white" : "bg-gray-200 text-black";
  const terminal = darkMode ? "bg-black text-green-400" : "bg-white text-black border-t";

  return (
    <div className={`flex h-full ${darkMode ? "bg-[#1e1e1e]" : "bg-[#f3f3f3]"}`}>
      <div className={`w-52 border-r ${explorerBg} ${explorerBorder}`}>
        <div className="flex items-center justify-between p-2 text-xs">
          <span>EXPLORER</span>
          <div className="flex gap-2">
            <button type="button" onClick={newFile}>📄</button>
            <button type="button" onClick={newFolder}>📁</button>
          </div>
        </div>
        {Object.entries(files).map(([name, node]) => (
          <div key={name}>
            <div
              onClick={() => setSelectedFolder(name)}
              className={`cursor-pointer px-3 py-1 ${selectedFolder === name ? selectedBg : ""}`}
            >
              📁 {name}
            </div>
            {isFolderNode(node)
              ? Object.keys(node.children).map((file) => {
                  const path = `${name}/${file}`;
                  return (
                    <div
                      key={file}
                      onClick={() => setActivePath(path)}
                      className={`cursor-pointer py-1 pl-6 ${activePath === path ? selectedBg : ""}`}
                    >
                      📄 {file}
                    </div>
                  );
                })
              : null}
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className={`flex items-center justify-between px-3 py-1 ${topbar}`}>
          <span className="truncate pr-3">{roomId ? activePath : "Editor"}</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setDarkMode((value) => !value)}>{darkMode ? "🌙" : "☀️"}</button>
            <select
              value={language.id}
              className={`border px-2 py-1 ${darkMode ? "border-gray-600 bg-[#1e1e1e] text-white" : "border-gray-400 bg-white text-black"}`}
              onChange={(e) => {
                const next = LANGUAGES.find((item) => item.id === Number(e.target.value));
                if (next) setLanguage(next);
              }}
            >
              {LANGUAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void runCode()}>Run</button>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <Editor
            height="100%"
            language={language.monaco}
            theme={darkMode ? "vs-dark" : "light"}
            value={code}
            onChange={(value) => setContent(activePath, value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
            }}
          />
        </div>

        <div className={`max-h-40 overflow-auto border-t px-3 py-2 text-sm ${terminal}`}>
          <div className="mb-1 text-xs uppercase opacity-70">Terminal</div>
          <pre className="whitespace-pre-wrap break-words">{output}</pre>
        </div>
      </div>
    </div>
  );
}
