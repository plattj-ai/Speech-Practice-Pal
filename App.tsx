// App.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Button from './components/Button';
import MicrophoneButton from './components/MicrophoneButton';
import ReadAloudButton from './components/ReadAloudButton';
import TimerDisplay from './components/TimerDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import FeedbackDisplay from './components/FeedbackDisplay';
import ReportModal from './components/ReportModal';
import { SessionState, ErrorDetail, ReportData, DetailedError, AnalysisResult, SentenceType } from './types'; 
import { TONGUE_TWISTER_SENTENCES, CONVERSATIONAL_SENTENCES, BUTTON_PRIMARY_PURPLE, BUTTON_SECONDARY_BLUE, PRIMARY_PURPLE, TEXT_DARK, ACCENT_BLUE, SLOWER_SPEECH_RATE, FAST_SPEECH_RATE } from './constants';
import { geminiService } from './services/geminiService';
import { decodeAudioData, decodeBase64, playAudioBuffer, encodeWAV } from './services/audioService'; 

// Raw content of audio-recorder-processor.js for dynamic loading via Blob URL
// This bypasses file path resolution issues by directly providing the script content.
const AUDIO_RECORDER_PROCESSOR_CODE = `
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
`;

const App: React.FC = () => {
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.CHOOSING_DURATION);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(5); 
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(0);
  const [recognitionAttemptCount, setRecognitionAttemptCount] = useState<number>(0);
  const [errorDetailsForDisplay, setErrorDetailsForDisplay] = useState<DetailedError[]>([]);
  const [spokenTranscription, setSpokenTranscription] = useState<string>(''); 
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [shouldEndSession, setShouldEndSession] = useState<boolean>(false);
  const [currentSentenceFeedback, setCurrentSentenceFeedback] = useState<string>(''); 
  const [chosenSentenceType, setChosenSentenceType] = useState<SentenceType>(SentenceType.CONVERSATIONAL); 
  const [currentSentenceList, setCurrentSentenceList] = useState<string[]>([]); 

  const timerRef = useRef<number | null>(null);
  const playingAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null); 
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioDataBufferRef = useRef<Float32Array[]>([]); 

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioGainNodeRef = useRef<GainNode | null>(null);
  const nextAudioStartTimeRef = useRef<number>(0);
  const audioWorkletBlobUrlRef = useRef<string | null>(null); // Ref for Blob URL

  // Initialize AudioContexts and GainNode
  useEffect(() => {
    outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
    outputAudioGainNodeRef.current = outputAudioContextRef.current.createGain();
    outputAudioGainNodeRef.current.connect(outputAudioContextRef.current.destination);

    // Initialize input AudioContext and load AudioWorklet module dynamically via Blob URL
    const initInputAudio = async () => {
      try {
        if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
          inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
        }
        
        // Create a Blob from the AudioWorklet script content
        const blob = new Blob([AUDIO_RECORDER_PROCESSOR_CODE], { type: 'application/javascript' });
        // Create an object URL for the Blob
        audioWorkletBlobUrlRef.current = URL.createObjectURL(blob);

        // Load the AudioWorklet module using the Blob URL
        await inputAudioContextRef.current.audioWorklet.addModule(audioWorkletBlobUrlRef.current);
      } catch (error) {
        console.error("Failed to load audio worklet module from Blob URL:", error);
        setMicrophoneError("Failed to initialize audio. Please try refreshing.");
        setSessionState(SessionState.MICROPHONE_DENIED);
      }
    };
    initInputAudio();

    return () => {
      outputAudioContextRef.current?.close();
      inputAudioContextRef.current?.close();
      microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
      audioWorkletNodeRef.current?.disconnect();
      // Revoke the Blob URL to free up memory
      if (audioWorkletBlobUrlRef.current) {
        URL.revokeObjectURL(audioWorkletBlobUrlRef.current);
        audioWorkletBlobUrlRef.current = null;
      }
    };
  }, []);

  const requestMicrophone = useCallback(async () => {
    try {
      if (inputAudioContextRef.current?.state === 'suspended') {
        await inputAudioContextRef.current.resume();
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000 } });
      microphoneStreamRef.current = stream; 
      return stream;
    } catch (err) {
      console.error("Microphone access denied:", err);
      setMicrophoneError("Microphone access is required for practice. Please enable it in your browser settings.");
      setSessionState(SessionState.MICROPHONE_DENIED);
      return null;
    }
  }, [setSessionState]);

  const errorHistoryRef = useRef<ErrorDetail[]>([]);
  const totalSentencesReadRef = useRef<number>(0);
  const difficultPhonemesAcrossSession = useRef<Set<string>>(new Set());

  const cleanupAudioResources = useCallback(async () => {
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.port.onmessage = null;
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    playingAudioSourcesRef.current.forEach(source => source.stop());
    playingAudioSourcesRef.current.clear();
    nextAudioStartTimeRef.current = 0; // Reset audio start time
    audioDataBufferRef.current = []; // Clear recorded audio data
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Do not close AudioContexts if they can be reused. Just disconnect nodes.
  }, []);

  const handleExitSession = useCallback(async () => {
    setIsLoading(true);
    await cleanupAudioResources();
    
    // Reset all session-related states
    setSessionState(SessionState.CHOOSING_DURATION);
    setSessionDurationMinutes(5);
    setTimeLeft(0);
    setIsRecording(false);
    setIsSpeaking(false);
    setIsLoading(false);
    setCurrentSentenceIndex(0);
    setRecognitionAttemptCount(0);
    setErrorDetailsForDisplay([]);
    setSpokenTranscription('');
    setReportData(null);
    setMicrophoneError(null);
    setShouldEndSession(false);
    setCurrentSentenceFeedback('');
    setChosenSentenceType(SentenceType.CONVERSATIONAL);
    setCurrentSentenceList([]);
    errorHistoryRef.current = [];
    totalSentencesReadRef.current = 0;
    difficultPhonemesAcrossSession.current.clear();
    
    setIsLoading(false);
  }, [cleanupAudioResources]);

  const handleSessionEnd = useCallback(async () => {
    setIsLoading(true);
    
    // Clean up audio resources if still active
    await cleanupAudioResources(); // Use the common cleanup function

    const totalErrors = errorHistoryRef.current.reduce((acc, curr) => acc + curr.errors.length, 0);

    let difficultSoundsAnalysis = "Your practice session has concluded. "; // More neutral opening
    // Fix: Corrected typo from `difficultPhiframesAcrossSession` to `difficultPhonemesAcrossSession`
    if (difficultPhonemesAcrossSession.current.size > 0) {
      difficultSoundsAnalysis += "Some sounds that were identified as areas for practice include: "; // Changed phrasing
      difficultSoundsAnalysis += Array.from(difficultPhonemesAcrossSession.current).map(s => `'${s}'`).join(', ');
      difficultSoundsAnalysis += ". Consistent practice with these phonemes is recommended."; // More clinical suggestion
    } else {
      difficultSoundsAnalysis += "No specific sounds were identified as consistently challenging during this session. This indicates solid progress!"; // More clinical praise
    }

    const reportSummary = `Session Duration: ${sessionDurationMinutes} minutes. Total Sentences Read: ${totalSentencesReadRef.current}. Total Errors Detected: ${totalErrors}. ${difficultSoundsAnalysis}`;
    let qualitativeAnalysis = "No qualitative analysis could be generated.";
    try {
      qualitativeAnalysis = await geminiService.generateQualitativeAnalysis(reportSummary);
    } catch (error) {
      console.error("Error generating qualitative analysis during session end:", error);
      qualitativeAnalysis = "I couldn't generate a qualitative analysis right now, but you did a great job practicing!";
    }

    const generatedReport: ReportData = {
      sessionDurationMinutes,
      totalSentencesRead: totalSentencesReadRef.current,
      totalErrors,
      errorHistory: errorHistoryRef.current,
      difficultSoundsAnalysis,
      qualitativeAnalysis,
      sentenceType: chosenSentenceType, 
    };
    setReportData(generatedReport);
    setSessionState(SessionState.REPORT);
    setIsLoading(false);
  }, [sessionDurationMinutes, chosenSentenceType, setSessionState, cleanupAudioResources]);

  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    if (sessionState === SessionState.PRACTICE && timeLeft > 0 && !isLoading && !isSpeaking) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (sessionState === SessionState.PRACTICE && timeLeft <= 0) {
      setShouldEndSession(true);
    }
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [sessionState, timeLeft, isLoading, isSpeaking]); 

  useEffect(() => {
    if (shouldEndSession) {
      handleSessionEnd();
      setShouldEndSession(false); 
    }
  }, [shouldEndSession, handleSessionEnd]);

  const startPracticeSession = useCallback(async (duration: number, type: SentenceType) => {
    setSessionDurationMinutes(duration);
    setTimeLeft(duration * 60);
    setChosenSentenceType(type); 
    setSessionState(SessionState.LOADING);
    setIsLoading(true);

    let sentences: string[];
    if (type === SentenceType.CONVERSATIONAL) {
      sentences = CONVERSATIONAL_SENTENCES;
    } else {
      sentences = TONGUE_TWISTER_SENTENCES;
    }
    setCurrentSentenceList(sentences);
    const randomIndex = Math.floor(Math.random() * sentences.length);
    setCurrentSentenceIndex(randomIndex);

    const stream = await requestMicrophone(); 
    if (stream) {
      stream.getTracks().forEach(track => track.stop()); 
      microphoneStreamRef.current = null; 
      setSessionState(SessionState.PRACTICE);
      setRecognitionAttemptCount(0);
      errorHistoryRef.current = []; 
      totalSentencesReadRef.current = 0; 
      difficultPhonemesAcrossSession.current.clear(); 
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setSessionState(SessionState.MICROPHONE_DENIED);
    }
  }, [requestMicrophone, setSessionState]);

  const currentSentence = currentSentenceList[currentSentenceIndex];

  const moveToNextSentence = useCallback(() => {
    if (currentSentenceList.length > 0) {
      let newIndex = Math.floor(Math.random() * currentSentenceList.length);
      if (currentSentenceList.length > 1) {
        while (newIndex === currentSentenceIndex) {
          newIndex = Math.floor(Math.random() * currentSentenceList.length);
        }
      }
      setCurrentSentenceIndex(newIndex);
    } else {
      setCurrentSentenceIndex(0); 
    }
    setRecognitionAttemptCount(0); 
    setErrorDetailsForDisplay([]); 
    setSpokenTranscription('');
    setCurrentSentenceFeedback(''); 
  }, [currentSentenceList, currentSentenceIndex]);

  const handleReadAloud = useCallback(async (text: string, speed?: number) => {
    if (!outputAudioContextRef.current || !outputAudioGainNodeRef.current) return;

    playingAudioSourcesRef.current.forEach(source => source.stop());
    playingAudioSourcesRef.current.clear();
    nextAudioStartTimeRef.current = outputAudioContextRef.current.currentTime; 

    setIsSpeaking(true);
    try {
      const audioBuffer = await geminiService.readSentence(text, outputAudioContextRef.current, speed);
      if (audioBuffer) {
        await playAudioBuffer(audioBuffer, outputAudioContextRef.current, outputAudioGainNodeRef.current, nextAudioStartTimeRef.current, playingAudioSourcesRef);
        nextAudioStartTimeRef.current += audioBuffer.duration;
      }
    } catch (error) {
      console.error("Failed to read aloud:", error);
      // Provide a simple audible fallback if TTS fails
      const fallbackSpeech = "I apologize, I'm unable to speak right now.";
      const utterance = new SpeechSynthesisUtterance(fallbackSpeech);
      window.speechSynthesis.speak(utterance);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const processRecordedAudio = useCallback(async (audioBlob: Blob) => {
    setIsLoading(true);
    setIsRecording(false); 

    try {
      // Convert the Blob (WAV) to a Base64 string for Gemini
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove "data:audio/wav;base64," header
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await base64Promise;

      // Send audio directly to Gemini for multimodal analysis
      const analysisResult: AnalysisResult = await geminiService.analyzePronunciation(currentSentence, audioBase64);
      
      const recognizedTranscript = analysisResult.spokenTranscript || '';
      setSpokenTranscription(recognizedTranscript);

      analysisResult.overallDifficultPhonemes.forEach(phoneme => difficultPhonemesAcrossSession.current.add(phoneme));

      setErrorDetailsForDisplay(analysisResult.detailedErrors);
      setCurrentSentenceFeedback(analysisResult.overallFeedback);
      
      totalSentencesReadRef.current++; 

      errorHistoryRef.current.push({
        timestamp: Date.now(),
        expectedSentence: currentSentence,
        spokenSentence: recognizedTranscript, 
        errors: analysisResult.detailedErrors,
        attempts: recognitionAttemptCount + 1,
      });

      // Provide audio feedback to the user
      await handleReadAloud(analysisResult.overallFeedback, FAST_SPEECH_RATE);

      // Move to next sentence if no errors, or if simply keeping flow active
      if (analysisResult.detailedErrors.length === 0) {
         moveToNextSentence();
      } else {
        setRecognitionAttemptCount((prev) => prev + 1);
      }

    } catch (error) {
      console.error("Error during speech processing or analysis:", error);
      const genericError = `I had a little trouble hearing that. Please ensure your microphone is working and try again!`;
      setMicrophoneError(genericError);
      await handleReadAloud(genericError, FAST_SPEECH_RATE);
      setCurrentSentenceFeedback("I couldn't analyze your speech just now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentSentence,
    recognitionAttemptCount,
    handleReadAloud,
    moveToNextSentence,
    setMicrophoneError, 
    setSessionState, 
  ]);

  const handleToggleRecord = useCallback(async () => {
    if (!inputAudioContextRef.current) {
      setMicrophoneError("Audio context not initialized. Please ensure microphone access.");
      setSessionState(SessionState.MICROPHONE_DENIED);
      return;
    }

    if (isRecording) {
      // Stop recording
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.port.onmessage = null; // Clear message handler
        audioWorkletNodeRef.current.disconnect();
        audioWorkletNodeRef.current = null;
      }
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
        microphoneStreamRef.current = null;
      }
      // Do NOT close inputAudioContext here. Keep it alive for subsequent recordings.
      // Resume it if it was suspended during inactivity (e.g. by iOS Safari)
      if (inputAudioContextRef.current.state === 'suspended') {
        await inputAudioContextRef.current.resume();
      }

      setIsRecording(false);
      
      if (audioDataBufferRef.current.length === 0) {
        const fallbackFeedback = "It sounds like I didn't quite catch what you said. Please make sure your microphone is working and try speaking clearly!";
        await handleReadAloud(fallbackFeedback, FAST_SPEECH_RATE);
        setCurrentSentenceFeedback(fallbackFeedback);
        setRecognitionAttemptCount((prev) => prev + 1);
        setIsLoading(false); // Ensure loading is off
        return;
      }

      const totalLength = audioDataBufferRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
      const mergedAudio = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of audioDataBufferRef.current) {
        mergedAudio.set(chunk, offset);
        offset += chunk.length;
      }
      audioDataBufferRef.current = []; 

      // WAV encoding is required for Gemini to understand the raw PCM
      const wavBlob = encodeWAV(mergedAudio, 16000); 
      await processRecordedAudio(wavBlob);

    } else {
      // Start recording
      setSpokenTranscription('');
      setErrorDetailsForDisplay([]);
      setCurrentSentenceFeedback('');
      
      const stream = await requestMicrophone();
      if (stream && inputAudioContextRef.current) {
        if (inputAudioContextRef.current.state === 'suspended') {
          await inputAudioContextRef.current.resume();
        }
        audioDataBufferRef.current = []; 
        
        const source = inputAudioContextRef.current.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(
          inputAudioContextRef.current,
          'audio-recorder-processor',
          { processorOptions: { sampleRate: 16000 } }
        );
        
        workletNode.port.onmessage = (event) => {
          if (event.data instanceof Float32Array) {
            audioDataBufferRef.current.push(new Float32Array(event.data)); // Push a copy
          }
        };

        source.connect(workletNode);
        workletNode.connect(inputAudioContextRef.current.destination); 

        audioWorkletNodeRef.current = workletNode;
        microphoneStreamRef.current = stream; 

        setIsRecording(true);
        setIsLoading(false); 
      } else {
        setIsLoading(false); 
        setSessionState(SessionState.MICROPHONE_DENIED);
      }
    }
  }, [isRecording, requestMicrophone, handleReadAloud, processRecordedAudio, setMicrophoneError, setSessionState]);


  useEffect(() => {
    if (recognitionAttemptCount >= 3) {
      handleReadAloud(`You've tried that sentence three times. Let's try a new one.`, FAST_SPEECH_RATE);
      moveToNextSentence();
    }
  }, [recognitionAttemptCount, moveToNextSentence, handleReadAloud]);

  const handleCloseReport = useCallback(() => {
    setReportData(null);
    setSessionState(SessionState.CHOOSING_DURATION); 
    setChosenSentenceType(SentenceType.CONVERSATIONAL);
    setSessionDurationMinutes(5);
  }, [setSessionState]);

  const renderContent = () => {
    switch (sessionState) {
      case SessionState.CHOOSING_DURATION:
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-xl max-w-lg mx-auto animate-fadeIn">
            <h2 className={`text-3xl font-bold ${TEXT_DARK} mb-6 text-center`}>Choose Your Practice Session!</h2>
            
            <p className={`text-lg ${TEXT_DARK} mb-4 text-center`}>
              What kind of sentences would you like to practice?
            </p>
            <div className="flex flex-col md:flex-row gap-4 w-full justify-center mb-8">
              <Button 
                onClick={() => setChosenSentenceType(SentenceType.CONVERSATIONAL)} 
                variant={chosenSentenceType === SentenceType.CONVERSATIONAL ? 'primary' : 'secondary'}
                className="flex-grow md:flex-grow-0"
              >
                Conversational
              </Button>
              <Button 
                onClick={() => setChosenSentenceType(SentenceType.TONGUE_TWISTER)} 
                variant={chosenSentenceType === SentenceType.TONGUE_TWISTER ? 'primary' : 'secondary'}
                className="flex-grow md:flex-grow-0"
              >
                Tongue Twisters
              </Button>
            </div>

            <p className={`text-lg ${TEXT_DARK} mb-4 text-center`}>
              How long would you like your session to be?
            </p>
            <div className="flex flex-col md:flex-row gap-4 w-full justify-center mb-8">
              <Button 
                onClick={() => setSessionDurationMinutes(5)} 
                variant={sessionDurationMinutes === 5 ? 'primary' : 'secondary'}
                className="flex-grow md:flex-grow-0"
              >
                5 Minutes
              </Button>
              <Button 
                onClick={() => setSessionDurationMinutes(10)} 
                variant={sessionDurationMinutes === 10 ? 'primary' : 'secondary'}
                className="flex-grow md:flex-grow-0"
              >
                10 Minutes
              </Button>
            </div>

            <Button onClick={() => startPracticeSession(sessionDurationMinutes, chosenSentenceType)} className={`${BUTTON_PRIMARY_PURPLE}`}>
              Start Practice!
            </Button>
          </div>
        );
      case SessionState.PRACTICE:
        return (
          <div className="flex flex-col items-center justify-between h-full w-full p-4 md:p-8">
            <div className="flex justify-between w-full max-w-3xl mb-8">
              <TimerDisplay timeLeft={timeLeft} />
              <p className={`text-lg font-medium ${ACCENT_BLUE}`}>Attempt: {recognitionAttemptCount + 1} / 3</p>
            </div>

            <div className="flex-grow flex items-center justify-center w-full max-w-4xl bg-purple-50 rounded-lg p-6 shadow-inner animate-fadeIn">
              {isLoading && !isRecording ? ( 
                <LoadingSpinner message="Listening and Thinking..." />
              ) : (
                <FeedbackDisplay
                  sentence={currentSentence}
                  errorWords={errorDetailsForDisplay.map(err => err.word)}
                />
              )}
            </div>

            {currentSentenceFeedback && ( 
              <div className="mt-4 p-3 bg-blue-100 border-l-4 border-blue-500 text-blue-800 rounded shadow animate-fadeIn max-w-lg mx-auto w-full">
                <p className="italic text-center">{currentSentenceFeedback}</p>
              </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white shadow-lg flex justify-center items-center space-x-4 md:space-x-8 z-40 border-t border-gray-200">
              <ReadAloudButton onReadAloud={() => handleReadAloud(currentSentence, SLOWER_SPEECH_RATE)} isSpeaking={isSpeaking || (isLoading && !isRecording)} disabled={isRecording} />
              <MicrophoneButton onToggleRecord={handleToggleRecord} isRecording={isRecording} disabled={isSpeaking || (isLoading && !isRecording)} />
            </div>
          </div>
        );
      case SessionState.LOADING:
        return <LoadingSpinner message="Starting your session..." className="flex-grow" />;
      case SessionState.REPORT:
        return reportData ? (
          <ReportModal reportData={reportData} onClose={handleCloseReport} />
        ) : (
          <LoadingSpinner message="Generating your report..." className="flex-grow" />
        );
      case SessionState.MICROPHONE_DENIED:
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-xl max-w-lg mx-auto animate-fadeIn text-center">
            <h2 className={`text-3xl font-bold text-red-600 mb-4`}>Microphone Access Required</h2>
            <p className={`text-lg ${TEXT_DARK} mb-6`}>
              {microphoneError || "We need access to your microphone to help you practice your sounds. Please enable it in your browser settings and try again."}
            </p>
            <Button onClick={() => {
              setChosenSentenceType(SentenceType.CONVERSATIONAL);
              setSessionDurationMinutes(5);
              setSessionState(SessionState.CHOOSING_DURATION);
            }} className={`${BUTTON_SECONDARY_BLUE}`}>
              Go Back
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Header sessionState={sessionState} onExitSession={handleExitSession} />
      <main className="flex-grow flex items-center justify-center p-4">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;