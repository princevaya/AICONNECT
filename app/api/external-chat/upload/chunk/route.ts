import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { auth } from "@clerk/nextjs/server";
import { ensureExternalChatUser } from "@/services/external-chat/user.service";
import { uploadAttachment } from "@/services/external-chat/storage.service";
import { toError } from "@/app/api/external-chat/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Save chunks in a temp directory outside the public folder
const CHUNK_DIR = path.join(process.cwd(), "tmp", "chunks");

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const chunk = form.get("chunk") as File;
    const fileId = form.get("fileId") as string;
    const chunkIndex = parseInt(form.get("chunkIndex") as string, 10);
    const totalChunks = parseInt(form.get("totalChunks") as string, 10);
    const fileName = form.get("fileName") as string;
    const roomId = form.get("roomId") as string;
    const roomCode = form.get("roomCode") as string;

    if (!chunk || !fileId || !fileName || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json({ error: "Missing chunk data" }, { status: 400 });
    }

    const sessionDir = path.join(CHUNK_DIR, fileId);
    await fs.mkdir(sessionDir, { recursive: true });

    // Save the chunk
    const chunkPath = path.join(sessionDir, `chunk-${chunkIndex}`);
    const buffer = Buffer.from(await chunk.arrayBuffer());
    await fs.writeFile(chunkPath, buffer);

    // If this is the last chunk, merge them!
    if (chunkIndex === totalChunks - 1) {
      const mergedPath = path.join(sessionDir, fileName);
      const writeStream = require("fs").createWriteStream(mergedPath);

      // Merge chunks in order
      for (let i = 0; i < totalChunks; i++) {
        const currentChunkPath = path.join(sessionDir, `chunk-${i}`);
        const readStream = require("fs").createReadStream(currentChunkPath);
        
        await new Promise((resolve, reject) => {
          readStream.pipe(writeStream, { end: false });
          readStream.on("end", resolve);
          readStream.on("error", reject);
        });
      }
      writeStream.end();

      // Wait for the file to be fully written
      await new Promise((resolve) => writeStream.on("finish", resolve));

      // Read the merged file into a File object for your existing service
      const mergedBuffer = await fs.readFile(mergedPath);
      const mergedFile = new File([mergedBuffer], fileName, { type: chunk.type });

      const user = await ensureExternalChatUser(userId);
      
      // Call your existing service
      const attachment = await uploadAttachment({
        file: mergedFile,
        roomId,
        roomCode,
        uploader: user,
      });

      // Clean up temp chunks
      await fs.rm(sessionDir, { recursive: true, force: true });

      return NextResponse.json({ attachment }, { status: 201 });
    }

    return NextResponse.json({ success: true, message: `Chunk ${chunkIndex} received` });
  } catch (error) {
    return toError(error, "Failed to upload chunk", 500);
  }
}
