"use client";

import { useEffect, useState } from "react";

export default function useFFmpeg() {
  const [ffmpeg, setFfmpeg] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

  useEffect(() => {
    const loadFFmpeg = async () => {
      setIsLoading(true);
      try {
        const { FFmpeg } = await import("@ffmpeg/ffmpeg");
        const { toBlobURL } = await import("@ffmpeg/util");
        const ffmpegInstance = new FFmpeg();
        await ffmpegInstance.load({
          coreURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript"
          ),
          wasmURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm"
          ),
        });
        setFfmpeg(ffmpegInstance);
      } catch (err) {
        setError("Failed to load FFmpeg");
      } finally {
        setIsLoading(false);
      }
    };

    loadFFmpeg();
  }, []);

  return { ffmpeg, isLoading, error };
}
