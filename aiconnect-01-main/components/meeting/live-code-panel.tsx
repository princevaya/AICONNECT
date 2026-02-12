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
  const wrappedCode = `
import React from "react";

export default function App() {
  return (
    <>
      ${code}
    </>
  );
}
`;

  return (
    <div className="absolute inset-0 z-40 bg-black/90">
      <SandpackProvider
        template="react"
        files={{
          "/App.js": wrappedCode,
        }}
        options={{
          autorun: true,
          autoReload: true,
          recompileMode: "delayed",
        }}
      >
        <SandpackLayout style={{ height: "100%" }}>
          <SandpackCodeEditor
            showLineNumbers
            showInlineErrors
            style={{ width: "50%" }}
          />

          <div className="flex flex-col" style={{ width: "50%" }}>
            <SandpackPreview />
            <SandpackConsole />
          </div>
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
