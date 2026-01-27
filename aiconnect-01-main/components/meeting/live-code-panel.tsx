"use client";

import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
} from "@codesandbox/sandpack-react";

export default function LiveCodePanel({
  code,
  onChange,
}: {
  code: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="absolute inset-0 z-40 bg-black/90">
      <SandpackProvider
        template="react"
        files={{
          "/App.js": code,
        }}
        options={{
          autorun: true,
          autoReload: true,
        }}
      >
        <SandpackLayout style={{ height: "100%" }}>
          <SandpackCodeEditor
            showLineNumbers
            showInlineErrors
            onChange={onChange}
          />
          <div className="flex flex-col w-1/2">
            <SandpackPreview />
            <SandpackConsole />
          </div>
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
