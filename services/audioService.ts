// services/audioService.ts
import React from 'react';
import { AudioBlob } from '../types'; // Keep for now, might remove if not used by any other part

/**
 * Decodes a base64 string into a Uint8Array.
 * This is a custom implementation required by the Gemini API guidance.
 * @param base64 The base64 encoded string.
 * @returns A Uint8Array of the decoded bytes.
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len); // Declare bytes here
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes a Uint8Array into a base64 string.
 * This is a custom implementation required by the Gemini API guidance.
 * @param bytes The Uint8Array to encode.
 * @returns A base64 encoded string.
 */
export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes raw PCM audio data (Uint8Array) into an AudioBuffer.
 * This is a custom implementation required by the Gemini API guidance.
 * @param data Raw PCM audio data as Uint8Array.
 * @param ctx The AudioContext to create the buffer in.
 * @param sampleRate The sample rate of the audio.
 * @param numChannels The number of audio channels (e.g., 1 for mono).
 * @returns A Promise that resolves with the decoded AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; // Normalize to [-1, 1]
    }
  }
  return buffer;
}

/**
 * Plays an AudioBuffer through the given AudioContext and output node.
 * @param audioBuffer The AudioBuffer to play.
 * @param outputContext The AudioContext for playback.
 * @param outputNode The AudioNode to connect the source to.
 * @param startTime The time when playback should start (in seconds relative to AudioContext's current time).
 * @param playingSources A mutable ref to a Set of currently playing AudioBufferSourceNodes, for management.
 * @returns A Promise that resolves when the audio has finished playing.
 */
export function playAudioBuffer(
  audioBuffer: AudioBuffer,
  outputContext: AudioContext,
  outputNode: GainNode,
  startTime: number,
  playingSources: React.MutableRefObject<Set<AudioBufferSourceNode>> // Added new parameter
): Promise<void> {
  return new Promise((resolve) => {
    const source = outputContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputNode);

    const onEnded = () => {
      playingSources.current.delete(source);
      source.removeEventListener('ended', onEnded);
      resolve();
    };

    source.addEventListener('ended', onEnded);
    source.start(startTime);
    playingSources.current.add(source); // Add source to set
  });
}

/**
 * Encodes raw Float32Array audio samples into a WAV Blob.
 * This includes the WAV header necessary for proper interpretation by many audio APIs.
 * @param samples Float32Array containing audio samples (mono).
 * @param sampleRate The sample rate of the audio (e.g., 16000 Hz).
 * @returns A Blob containing the WAV audio data.
 */
export function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1; // Mono audio
  const bytesPerSample = 2; // 16-bit PCM

  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  let offset = 0;

  function writeString(view: DataView, offset: number, s: string) {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  }

  function writeUint32(view: DataView, offset: number, value: number) {
    view.setUint32(offset, value, true); // Little-endian
  }

  function writeUint16(view: DataView, offset: number, value: number) {
    view.setUint16(offset, value, true); // Little-endian
  }

  // RIFF identifier
  writeString(view, offset, 'RIFF'); offset += 4;
  // file length
  writeUint32(view, offset, 36 + dataLength); offset += 4;
  // RIFF type
  writeString(view, offset, 'WAVE'); offset += 4;
  // format chunk identifier
  writeString(view, offset, 'fmt '); offset += 4;
  // format chunk length
  writeUint32(view, offset, 16); offset += 4;
  // sample format (1 = PCM)
  writeUint16(view, offset, 1); offset += 2;
  // number of channels
  writeUint16(view, offset, numChannels); offset += 2;
  // sample rate
  writeUint32(view, offset, sampleRate); offset += 4;
  // byte rate (sample rate * channels * bytes per sample)
  writeUint32(view, offset, sampleRate * numChannels * bytesPerSample); offset += 4;
  // block align (channels * bytes per sample)
  writeUint16(view, offset, numChannels * bytesPerSample); offset += 2;
  // bits per sample
  writeUint16(view, offset, bytesPerSample * 8); offset += 2;
  // data chunk identifier
  writeString(view, offset, 'data'); offset += 4;
  // data chunk length
  writeUint32(view, offset, dataLength); offset += 4;

  // Write the PCM data
  for (let i = 0; i < samples.length; i++, offset += 2) {
    // Convert Float32 to Int16
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // Little-endian
  }

  return new Blob([view], { type: 'audio/wav' });
}
