// App.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Button from './components/Button';
import MicrophoneButton from './components/MicrophoneButton';
import ReadAloudButton from './components/ReadAloudButton';
import LoadingSpinner from './components/LoadingSpinner';
import FeedbackDisplay from './components/FeedbackDisplay';
import ReportModal from './components/ReportModal';
import { SessionState, ErrorDetail, ReportData, DetailedError, AnalysisResult, SentenceType, PhonemeType, DifficultyLevel } from './types'; 
import { 
  SENTENCE_LIBRARY,
  BUTTON_PRIMARY_PURPLE, 
  BUTTON_SECONDARY_BLUE, 
  PRIMARY_PURPLE, 
  TEXT_DARK, 
  ACCENT_BLUE, 
  SLOWER_SPEECH_RATE, 
  FAST_SPEECH_RATE, 
  MICROPHONE_GAIN_FACTOR 
} from './constants';
import { geminiService } from './services/geminiService';
import { decodeAudioData, decodeBase64, playAudioBuffer, encodeWAV } from './services/audioService'; 

const AUDIO_RECORDER_PROCESSOR_CODE = `
class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }
  process(inputs, outputs, parameters) {
    if (inputs[0] && inputs[0].length > 0) {
      const inputChannelData = inputs[0][0];
      this.port.postMessage(inputChannelData);
    }
    return true;
  }
}
registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
`;

const App: React.FC = () => {
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.CHOOSING_DIFFICULTY);
  const [totalSentencesInSession, setTotalSentencesInSession] = useState<number>(10);
  const [targetPhoneme, setTargetPhoneme] = useState<PhonemeType>(PhonemeType.MIX);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('A');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Analyzing...");
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

  const playingAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null); 
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioDataBufferRef = useRef<Float32Array[]>([]); 
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioGainNodeRef = useRef<GainNode | null>(null);
  const nextAudioStartTimeRef = useRef<number>(0);
  const audioWorkletBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
    outputAudioGainNodeRef.current = outputAudioContextRef.current.createGain();
    outputAudioGainNodeRef.current.connect(outputAudioContextRef.current.destination);

    const initInputAudio = async () => {
      try {
        if (!inputAudioContextRef.current) {
          inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
        }
        const blob = new Blob([AUDIO_RECORDER_PROCESSOR_CODE], { type: 'application/javascript' });
        audioWorkletBlobUrlRef.current = URL.createObjectURL(blob);
        await inputAudioContextRef.current.audioWorklet.addModule(audioWorkletBlobUrlRef.current);
      } catch (error) {
        console.error("Failed to load audio worklet:", error);
        setMicrophoneError("Failed to initialize audio. Please try refreshing.");
        setSessionState(SessionState.MICROPHONE_DENIED);
      }
    };
    initInputAudio();

    return () => {
      outputAudioContextRef.current?.close();
      inputAudioContextRef.current?.close();
      microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
      if (audioWorkletBlobUrlRef.current) {
        URL.revokeObjectURL(audioWorkletBlobUrlRef.current);
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
      setMicrophoneError("Microphone access is required for practice.");
      setSessionState(SessionState.MICROPHONE_DENIED);
      return null;
    }
  }, []);

  const errorHistoryRef = useRef<ErrorDetail[]>([]);
  const totalSentencesReadRef = useRef<number>(0);
  const difficultPhonemesAcrossSession = useRef<Set<string>>(new Set());

  const cleanupAudioResources = useCallback(async () => {
    playingAudioSourcesRef.current.forEach(source => source.stop());
    playingAudioSourcesRef.current.clear();
    nextAudioStartTimeRef.current = 0;

    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.port.onmessage = null;
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    audioDataBufferRef.current = [];
    if (inputAudioContextRef.current && inputAudioContextRef.current.state === 'running') {
      await inputAudioContextRef.current.suspend();
    }
  }, []);

  const handleExitSession = useCallback(async () => {
    setIsLoading(true);
    await cleanupAudioResources();
    setSessionState(SessionState.CHOOSING_DIFFICULTY);
    setIsLoading(false);
  }, [cleanupAudioResources]);

  const handleSessionEnd = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage("Speech Pal is writing your report...");
    await cleanupAudioResources();
    const totalErrors = errorHistoryRef.current.reduce((acc, curr) => acc + curr.errors.length, 0);
    let difficultSoundsAnalysis = "Session concluded. ";
    if (difficultPhonemesAcrossSession.current.size > 0) {
      difficultSoundsAnalysis += "Areas for practice: " + Array.from(difficultPhonemesAcrossSession.current).map(s => `'${s}'`).join(', ');
    }
    const reportSummary = `Total Sentences: ${totalSentencesInSession}. Errors: ${totalErrors}. Target Sound: ${targetPhoneme}. ${difficultSoundsAnalysis}`;
    let qualitativeAnalysis = "The student completed targeted practice.";
    try {
      qualitativeAnalysis = await geminiService.generateQualitativeAnalysis(reportSummary, difficultyLevel);
    } catch (error) {
      console.error(error);
    }
    setReportData({
      totalSentencesInSession,
      totalSentencesRead: totalSentencesReadRef.current,
      totalErrors,
      errorHistory: errorHistoryRef.current,
      difficultSoundsAnalysis,
      qualitativeAnalysis,
      sentenceType: chosenSentenceType,
      targetPhoneme,
      difficultyLevel,
    });
    setSessionState(SessionState.REPORT);
    setIsLoading(false);
  }, [totalSentencesInSession, chosenSentenceType, targetPhoneme, difficultyLevel, cleanupAudioResources]);

  useEffect(() => {
    if (sessionState === SessionState.PRACTICE && totalSentencesReadRef.current >= totalSentencesInSession) {
      setShouldEndSession(true);
    }
  }, [sessionState, totalSentencesInSession]);

  useEffect(() => {
    if (shouldEndSession) {
      handleSessionEnd();
      setShouldEndSession(false); 
    }
  }, [shouldEndSession, handleSessionEnd]);

  const startPracticeSession = useCallback(async (numSentences: number, type: SentenceType, phoneme: PhonemeType) => {
    setTotalSentencesInSession(numSentences);
    setChosenSentenceType(type); 
    setTargetPhoneme(phoneme);
    setSessionState(SessionState.LOADING);
    setIsLoading(true);
    
    let baseSentences: string[] = [];
    const diffLibrary = SENTENCE_LIBRARY[difficultyLevel];

    if (phoneme === PhonemeType.MIX) {
      baseSentences = [
        ...diffLibrary[PhonemeType.L],
        ...diffLibrary[PhonemeType.R],
        ...diffLibrary[PhonemeType.S],
        ...diffLibrary[SentenceType.CONVERSATIONAL],
        ...diffLibrary[SentenceType.TONGUE_TWISTER]
      ];
    } else {
      baseSentences = diffLibrary[phoneme] || diffLibrary[type] || diffLibrary[PhonemeType.L];
    }

    // Shuffle and pick unique sentences to prevent repeats
    const uniqueSessionSentences = [...baseSentences]
      .sort(() => Math.random() - 0.5)
      .slice(0, numSentences);

    setCurrentSentenceList(uniqueSessionSentences);
    setCurrentSentenceIndex(0);
    totalSentencesReadRef.current = 0;
    errorHistoryRef.current = [];
    difficultPhonemesAcrossSession.current = new Set();
    
    const stream = await requestMicrophone(); 
    if (stream) {
      stream.getTracks().forEach(track => track.stop()); 
      setSessionState(SessionState.PRACTICE);
      setIsLoading(false);
    } else {
      setSessionState(SessionState.MICROPHONE_DENIED);
    }
  }, [requestMicrophone, difficultyLevel]);

  const currentSentence = currentSentenceList[currentSentenceIndex];

  const moveToNextSentence = useCallback(() => {
    setCurrentSentenceIndex(prev => prev + 1);
    setRecognitionAttemptCount(0); 
    setErrorDetailsForDisplay([]); 
    setSpokenTranscription('');
    setCurrentSentenceFeedback(''); 
  }, []);

  const handleReadAloud = useCallback(async (text: string, speed?: number) => {
    if (!outputAudioContextRef.current || !outputAudioGainNodeRef.current) return;
    playingAudioSourcesRef.current.forEach(source => source.stop());
    playingAudioSourcesRef.current.clear();
    if (outputAudioContextRef.current.state === 'suspended') await outputAudioContextRef.current.resume();
    nextAudioStartTimeRef.current = outputAudioContextRef.current.currentTime; 
    setIsSpeaking(true);
    try {
      const audioBuffer = await geminiService.readSentence(text, outputAudioContextRef.current, speed);
      if (audioBuffer) await playAudioBuffer(audioBuffer, outputAudioContextRef.current, outputAudioGainNodeRef.current, nextAudioStartTimeRef.current, playingAudioSourcesRef);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const processRecordedAudio = useCallback(async (audioBlob: Blob) => {
    setIsLoading(true);
    const messages = [
      "Speech Pal is listening closely...",
      "Analyzing speech sounds...",
      "Checking for substitutions...",
      "Almost there...",
    ];
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingMessage(messages[msgIndex]);
    }, 2500);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
      });
      const audioBase64 = await base64Promise;
      const analysisResult = await geminiService.analyzePronunciation(currentSentence, audioBase64, targetPhoneme, difficultyLevel);
      setSpokenTranscription(analysisResult.spokenTranscript);
      analysisResult.overallDifficultPhonemes.forEach(p => difficultPhonemesAcrossSession.current.add(p));
      setErrorDetailsForDisplay(analysisResult.detailedErrors);
      setCurrentSentenceFeedback(analysisResult.overallFeedback);
      
      errorHistoryRef.current.push({
        timestamp: Date.now(),
        expectedSentence: currentSentence,
        spokenSentence: analysisResult.spokenTranscript, 
        errors: analysisResult.detailedErrors,
        attempts: recognitionAttemptCount + 1,
      });

      await handleReadAloud(analysisResult.overallFeedback, FAST_SPEECH_RATE);
      
      if (analysisResult.detailedErrors.length === 0) {
        totalSentencesReadRef.current++; 
        moveToNextSentence();
      } else {
        setRecognitionAttemptCount(prev => prev + 1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
      setLoadingMessage("Analyzing...");
    }
  }, [currentSentence, recognitionAttemptCount, targetPhoneme, difficultyLevel, handleReadAloud, moveToNextSentence]);

  const handleToggleRecord = useCallback(async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsLoading(true);
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.port.onmessage = null; 
        audioWorkletNodeRef.current.disconnect();
      }
      if (microphoneStreamRef.current) microphoneStreamRef.current.getTracks().forEach(t => t.stop());
      if (audioDataBufferRef.current.length > 0) {
        const totalLength = audioDataBufferRef.current.reduce((acc, c) => acc + c.length, 0);
        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const c of audioDataBufferRef.current) { merged.set(c, offset); offset += c.length; }
        audioDataBufferRef.current = []; 
        await processRecordedAudio(encodeWAV(merged, 16000));
      } else {
        setIsLoading(false);
      }
    } else {
      setSpokenTranscription('');
      setErrorDetailsForDisplay([]);
      setCurrentSentenceFeedback('');
      const stream = await requestMicrophone();
      if (stream && inputAudioContextRef.current) {
        if (inputAudioContextRef.current.state === 'suspended') await inputAudioContextRef.current.resume();
        audioDataBufferRef.current = []; 
        const source = inputAudioContextRef.current.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(inputAudioContextRef.current, 'audio-recorder-processor');
        const gainNode = inputAudioContextRef.current.createGain();
        gainNode.gain.value = MICROPHONE_GAIN_FACTOR;
        source.connect(gainNode);
        gainNode.connect(workletNode);
        workletNode.port.onmessage = (e) => { if (e.data instanceof Float32Array) audioDataBufferRef.current.push(new Float32Array(e.data)); };
        audioWorkletNodeRef.current = workletNode;
        microphoneStreamRef.current = stream; 
        setIsRecording(true);
      }
    }
  }, [isRecording, requestMicrophone, processRecordedAudio]);

  const handleCloseReport = useCallback(() => {
    setReportData(null);
    setSessionState(SessionState.CHOOSING_DIFFICULTY); 
  }, []);

  const renderContent = () => {
    switch (sessionState) {
      case SessionState.CHOOSING_DIFFICULTY:
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl max-w-2xl mx-auto animate-fadeIn text-center">
            <h2 className="text-4xl font-black text-purple-900 mb-2">Welcome!</h2>
            <p className="text-gray-600 mb-8 font-medium">Select your Difficulty Level to begin.</p>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 w-full">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((level) => (
                <button 
                  key={level}
                  onClick={() => { setDifficultyLevel(level as DifficultyLevel); setSessionState(SessionState.CHOOSING_DURATION); }}
                  className="group flex flex-col items-center justify-center bg-purple-50 hover:bg-purple-600 p-4 rounded-xl transition-all duration-300 border-2 border-purple-100 hover:border-purple-600 shadow-sm"
                >
                  <span className="text-2xl font-bold text-purple-800 group-hover:text-white">{level}</span>
                  <span className="text-[10px] uppercase font-bold text-purple-400 group-hover:text-purple-100">Level</span>
                </button>
              ))}
            </div>
          </div>
        );

      case SessionState.CHOOSING_DURATION:
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-xl max-w-2xl mx-auto animate-fadeIn overflow-y-auto">
            <div className="flex items-center space-x-2 mb-6">
              <button onClick={() => setSessionState(SessionState.CHOOSING_DIFFICULTY)} className="text-purple-600 hover:underline text-sm font-bold">← Back to Levels</button>
              <span className="text-gray-300">|</span>
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Difficulty Level {difficultyLevel}</span>
            </div>
            <h2 className={`text-3xl font-bold ${TEXT_DARK} mb-8 text-center`}>Practice Setup</h2>
            
            <div className="w-full mb-8">
              <p className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 text-center">1. Choose Your Sound</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button onClick={() => setTargetPhoneme(PhonemeType.L)} variant={targetPhoneme === PhonemeType.L ? 'primary' : 'secondary'}>L sound</Button>
                <Button onClick={() => setTargetPhoneme(PhonemeType.R)} variant={targetPhoneme === PhonemeType.R ? 'primary' : 'secondary'}>R sound</Button>
                <Button onClick={() => setTargetPhoneme(PhonemeType.S)} variant={targetPhoneme === PhonemeType.S ? 'primary' : 'secondary'}>S sound</Button>
                <Button onClick={() => setTargetPhoneme(PhonemeType.MIX)} variant={targetPhoneme === PhonemeType.MIX ? 'primary' : 'secondary'}>Mix All</Button>
              </div>
            </div>

            <div className="w-full mb-8">
              <p className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 text-center">2. Choose Your Style</p>
              <div className="flex flex-col md:flex-row gap-3">
                <Button className="flex-1" onClick={() => setChosenSentenceType(SentenceType.CONVERSATIONAL)} variant={chosenSentenceType === SentenceType.CONVERSATIONAL ? 'primary' : 'secondary'}>Conversational</Button>
                <Button className="flex-1" onClick={() => setChosenSentenceType(SentenceType.TONGUE_TWISTER)} variant={chosenSentenceType === SentenceType.TONGUE_TWISTER ? 'primary' : 'secondary'}>Tongue Twisters</Button>
              </div>
            </div>

            <div className="w-full mb-10">
              <p className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 text-center">3. Session Length</p>
              <div className="flex flex-col md:flex-row gap-3">
                <Button className="flex-1" onClick={() => setTotalSentencesInSession(10)} variant={totalSentencesInSession === 10 ? 'primary' : 'secondary'}>10 Sentences</Button>
                <Button className="flex-1" onClick={() => setTotalSentencesInSession(20)} variant={totalSentencesInSession === 20 ? 'primary' : 'secondary'}>20 Sentences</Button>
              </div>
            </div>

            <Button className="w-full py-4 text-xl shadow-lg hover:scale-105 active:scale-95" onClick={() => startPracticeSession(totalSentencesInSession, chosenSentenceType, targetPhoneme)}>
              Start Practice!
            </Button>
          </div>
        );
      case SessionState.PRACTICE:
        const progressPercentage = (totalSentencesReadRef.current / totalSentencesInSession) * 100;
        return (
          <div className="flex flex-col items-center justify-between h-full w-full p-4 md:p-8">
            <div className="flex flex-col items-center w-full max-w-4xl">
               <div className="flex justify-between items-end w-full mb-1 px-1">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500">Practice Progress</span>
                 <span className="text-xs font-bold text-purple-700">{totalSentencesReadRef.current} / {totalSentencesInSession}</span>
               </div>
               <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner overflow-hidden mb-4">
                 <div 
                   className="bg-gradient-to-r from-purple-500 to-purple-700 h-full transition-all duration-1000 ease-out" 
                   style={{ width: `${progressPercentage}%` }}
                 ></div>
               </div>
               <div className="flex space-x-2">
                 <p className={`text-sm font-bold ${ACCENT_BLUE} uppercase tracking-tight`}>Try: {recognitionAttemptCount + 1} / 3</p>
                 <span className="text-gray-300">|</span>
                 {targetPhoneme !== PhonemeType.MIX && (
                   <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-bold uppercase">
                     {targetPhoneme} Sound
                   </span>
                 )}
                 <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold uppercase">
                   Level {difficultyLevel}
                 </span>
               </div>
            </div>
            
            <div className="flex-grow flex items-center justify-center w-full max-w-4xl bg-white border-2 border-purple-50 rounded-3xl p-8 shadow-xl animate-fadeIn relative overflow-hidden my-6">
              {isLoading && !isRecording ? ( 
                <LoadingSpinner message={loadingMessage} />
              ) : (
                <FeedbackDisplay sentence={currentSentence} errorWords={errorDetailsForDisplay.map(err => err.word)} />
              )}
            </div>
            
            {currentSentenceFeedback && ( 
              <div className="mb-24 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-indigo-400 text-indigo-900 rounded-xl shadow-md animate-slideUp max-w-2xl mx-auto w-full">
                <p className="text-sm md:text-base font-medium text-center leading-relaxed">"{currentSentenceFeedback}"</p>
              </div>
            )}
            
            <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 bg-white/80 backdrop-blur-md shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex justify-center items-center space-x-4 md:space-x-10 z-40 border-t border-gray-100">
              <ReadAloudButton onReadAloud={() => handleReadAloud(currentSentence, SLOWER_SPEECH_RATE)} isSpeaking={isSpeaking} disabled={isRecording} />
              <MicrophoneButton onToggleRecord={handleToggleRecord} isRecording={isRecording} disabled={isSpeaking || isLoading} />
            </div>
          </div>
        );
      case SessionState.LOADING: return <LoadingSpinner message="Starting your session..." className="flex-grow" />;
      case SessionState.REPORT: return reportData ? <ReportModal reportData={reportData} onClose={handleCloseReport} /> : null;
      case SessionState.MICROPHONE_DENIED:
        return (
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-xl max-w-lg mx-auto text-center">
            <h2 className="text-3xl font-bold text-red-600 mb-4">Microphone Access Required</h2>
            <p className="text-lg mb-6">{microphoneError || "Enable microphone access in settings."}</p>
            <Button onClick={() => setSessionState(SessionState.CHOOSING_DIFFICULTY)} variant="secondary">Go Back</Button>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Header sessionState={sessionState} onExitSession={handleExitSession} />
      <main className="flex-grow flex items-center justify-center p-4">{renderContent()}</main>
    </div>
  );
};

export default App;