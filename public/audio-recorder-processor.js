// audio-recorder-processor.js
// This file is an AudioWorkletProcessor, which runs in a separate thread.

/**
 * An AudioWorkletProcessor for recording audio data from a microphone.
 * It receives audio input from the browser's audio graph and posts Float32Array
 * chunks back to the main thread for further processing.
 */
class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // This port allows communication between the Worklet and the main thread.
    this.port.onmessage = (event) => {
      // Future: Could handle messages like setting sample rate, starting/stopping.
      // For now, it primarily sends data out.
    };
  }

  /**
   * The process method is called by the Web Audio API on the audio rendering thread.
   * It receives audio input and can produce audio output.
   * @param inputs An array of audio input arrays. Each inner array represents a channel.
   * @param outputs An array of audio output arrays (not used for recording).
   * @param parameters A map of AudioParam names and their current values (not used here).
   * @returns Always returns true to indicate that the AudioWorkletNode is still active.
   */
  process(inputs, outputs, parameters) {
    // Only process if there's input audio and it has at least one channel.
    if (inputs[0] && inputs[0].length > 0) {
      const inputChannelData = inputs[0][0]; // Get the first channel of the first input.
      
      // Post the audio data (Float32Array) back to the main thread.
      // Transferable objects can be moved efficiently without copying.
      this.port.postMessage(inputChannelData);
    }
    
    // Return true to keep the AudioWorkletNode alive and processing.
    return true;
  }
}

// Register the AudioWorkletProcessor with a unique name.
registerProcessor('audio-recorder-processor', AudioRecorderProcessor);