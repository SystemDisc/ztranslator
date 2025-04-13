"use server";

import { listModels, ModelEntry } from "@huggingface/hub";
import { WaveFile } from "wavefile";
import { generateText, experimental_transcribe as transcribe } from "ai";
import { openai } from "@ai-sdk/openai";

export const getLanguages = async () => {
  const models: ModelEntry[] = [];
  for await (const model of listModels({
    search: { query: "Helsinki-NLP/opus-mt-" },
  })) {
    models.push(model);
  }

  const languagePairs = new Map<string, string[]>();

  models.forEach((model: ModelEntry) => {
    const match = model.name.match(/^Helsinki-NLP\/opus-mt-([a-z]+)-([a-z]+)$/);
    if (match) {
      const [, source, target] = match;
      if (!languagePairs.has(source)) {
        languagePairs.set(source, []);
      }
      languagePairs.get(source)?.push(target);
    }
  });

  return languagePairs;
};

export const translate = async (
  wavData: Uint8Array,
  sourceLanguage: string,
  destinationLanguage: string
) => {
  // Use ai and @ai-sdk/openai gpt-4o-transcribe to transcribe the audio
  const audioFile = new WaveFile();
  audioFile.fromBuffer(wavData);
  const audioData = audioFile.toBuffer();
  const { text: sourceText } = await transcribe({
    model: openai.transcription("gpt-4o-transcribe"),
    audio: audioData,
  });

  // Use ai and @ai-sdk/openai gpt-4o to translate sourceText
  const { text: outputText } = await generateText({
    model: openai("gpt-4o"),
    prompt: `Translate the following text from ${sourceLanguage} to ${destinationLanguage}: ${sourceText}`,
  });

  return outputText;
};
