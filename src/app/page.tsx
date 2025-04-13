"use client";

import useFFmpeg from "@/hooks/use-ffmpeg";
import { getLanguages, translate } from "@/server/translate";
import React, { useEffect, useState } from "react";

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [destinationLanguage, setDestinationLanguage] = useState("");
  const [languagePairs, setLanguagePairs] = useState<Map<string, string[]>>(
    new Map<string, string[]>()
  );
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [availableDestinations, setAvailableDestinations] = useState<string[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setAudioFile(event.target.files[0]);
    }
  };

  const { ffmpeg, isLoading: ffmpegLoading, error: ffmpegError } = useFFmpeg();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log("Audio File:", audioFile);
    console.log("Source Language:", sourceLanguage);
    console.log("Destination Language:", destinationLanguage);
    if (!audioFile || !sourceLanguage || !destinationLanguage) {
      setError("Please select an audio file and both languages.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setTranslatedText(null);
    try {
      const mimeType = audioFile.type;
      if (!mimeType.startsWith("audio/")) {
        setError("Please upload a valid audio file.");
        return;
      }
      // Re-encode audio file from any source type to .wav
      let buffer = await audioFile.arrayBuffer();
      let view = new Uint8Array(buffer);
      if (mimeType !== "audio/wav") {
        setIsConverting(true);
        // Write the file to the FFmpeg filesystem
        const arrayBuffer = await audioFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const inputFileName = `input.${mimeType.split("/")[1]}`;
        const outputFileName = `output-${Math.random()
          .toString(36)
          .substring(2, 15)}.wav`;
        ffmpeg.writeFile(inputFileName, uint8Array);

        // Convert the file to WAV format
        await ffmpeg.exec([
          "-i",
          inputFileName,
          "-ar",
          "16000",
          "-ac",
          "1",
          outputFileName,
        ]);

        // Read the converted WAV file
        const output = await ffmpeg.readFile(outputFileName);

        // Convert the output to an ArrayBuffer
        buffer = new ArrayBuffer(output.length);
        view = new Uint8Array(buffer);
        for (let i = 0; i < output.length; i++) {
          view[i] = +output[i];
        }

        setIsConverting(false);
      }

      setIsTranslating(true);
      const translation = await translate(
        view,
        sourceLanguage,
        destinationLanguage
      );
      setTranslatedText(translation);
    } catch (error) {
      console.error("Translation Error:", error);
      setError("An error occurred during translation.");
    } finally {
      setIsLoading(false);
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    const fetchLanguages = async () => {
      const languages = await getLanguages();
      setLanguagePairs(languages);
      const availableLanguages = Array.from(languages.keys());
      setAvailableLanguages(availableLanguages);
      const availableDestinations = languages.get(sourceLanguage) || [];
      setAvailableDestinations(availableDestinations);
      console.log("Available Languages:", availableLanguages);
      console.log("Available Destinations:", availableDestinations);
    };
    fetchLanguages();
  }, []);

  useEffect(() => {
    const availableDestinations = languagePairs.get(sourceLanguage) || [];
    setAvailableDestinations(availableDestinations);
  }, [sourceLanguage, languagePairs]);

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center flex-col gap-4 py-4">
      {ffmpegLoading && (
        <div className="loading loading-spinner loading-lg text-primary m-auto block"></div>
      )}
      {!ffmpegLoading && (
        <div className="card w-full max-w-md shadow-xl bg-base-100">
          <div className="card-body relative overflow-hidden">
            <h2 className="card-title">Audio Translator</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* File Input */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Upload Audio File</span>
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="file-input file-input-bordered w-full"
                />
              </div>

              {/* Source Language Selector */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Source Language</span>
                </label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option disabled value="">
                    Select Source Language
                  </option>
                  {availableLanguages.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Language Selector */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Destination Language</span>
                </label>
                <select
                  value={destinationLanguage}
                  onChange={(e) => setDestinationLanguage(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option disabled value="">
                    Select Destination Language
                  </option>
                  {availableDestinations.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <div className="form-control mt-4">
                <button type="submit" className="btn btn-primary w-full">
                  Translate
                </button>
              </div>
            </form>
            {isLoading && (
              <div className="absolute top-0 left-0 bottom-0 right-0 p-4 bg-[rgba(0,0,0,0.5)]">
                <div className="loading loading-spinner loading-lg text-primary m-auto block"></div>
              </div>
            )}
          </div>
        </div>
      )}
      {isConverting && (
        <div className="alert alert-info mt-4">
          <span>Converting audio file...</span>
        </div>
      )}
      {isTranslating && (
        <div className="alert alert-info mt-4">
          <span>Translating...</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error mt-4">
          <span>{error}</span>
        </div>
      )}
      {translatedText && (
        <div className="card w-full max-w-md shadow-xl bg-base-100">
          <div className="card-body relative">
            <h2 className="card-title">Translation</h2>
            <span>{translatedText}</span>
          </div>
        </div>
      )}
    </div>
  );
}
