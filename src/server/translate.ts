"use server";

import { pipeline, TranslationOutput } from "@huggingface/transformers";
import { listModels, ModelEntry } from "@huggingface/hub";
import { WaveFile } from "wavefile";

export const getLanguages = async () => {
  const models: ModelEntry[] = [];
  for await (const model of listModels({
    search: { query: "Xenova/opus-mt-" },
  })) {
    models.push(model);
  }

  const languagePairs = new Map<string, string[]>();

  models.forEach((model: ModelEntry) => {
    const match = model.name.match(/^Xenova\/opus-mt-([a-z]+)-([a-z]+)$/);
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
  const transcriber = await pipeline(
    "automatic-speech-recognition",
    `Xenova/whisper-small`
  );

  // Read .wav file and convert it to required format
  const wav = new WaveFile(wavData);
  wav.toBitDepth("32f"); // Pipeline expects input as a Float32Array
  wav.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000
  let audioData = wav.getSamples();
  if (Array.isArray(audioData)) {
    if (audioData.length > 1) {
      const SCALING_FACTOR = Math.sqrt(2);

      // Merge channels (into first channel to save memory)
      for (let i = 0; i < audioData[0].length; ++i) {
        audioData[0][i] =
          (SCALING_FACTOR * (audioData[0][i] + audioData[1][i])) / 2;
      }
    }

    // Select first channel
    audioData = audioData[0];
  }

  // Transcribe and ranslate
  const transcription = await transcriber(audioData, {
    chunk_length_s: 30,
    language: sourceLanguage,
  });
  const translator = await pipeline(
    "translation",
    `Xenova/opus-mt-${sourceLanguage}-${destinationLanguage}`
  );
  const translatedText = await translator(
    Array.isArray(transcription)
      ? transcription.reduce((acc, curr) => acc + " " + curr.text, "")
      : transcription.text
  );

  if (Array.isArray(translatedText[0])) {
    // If the output is an array of arrays, flatten it
    return (translatedText as TranslationOutput[]).reduce(
      (acc, curr) =>
        `${acc} ${curr
          .map((translation) => translation.translation_text)
          .join(" ")}`,
      ""
    );
  } else {
    return (translatedText as TranslationOutput)
      .map((translation) => translation.translation_text)
      .join(" ");
  }
};
