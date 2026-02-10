
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
  const [targetPhonemes, setTargetPhonemes] = useState<string[]>([]);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel | null>(null);
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
  const [currentSentenceFeedback, setCurrentSentenceFeedback] = useState<string>(''); 
  const [chosenSentenceType, setChosenSentenceType] = useState<SentenceType>(SentenceType.CONVERSATIONAL); 
  const [currentSentenceList, setCurrentSentenceList] = useState<string[]>([]); 
  const [isCurrentSentenceSuccess, setIsCurrentSentenceSuccess] = useState<boolean>(false);

  const playingAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null); 
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioDataBufferRef = useRef<Float32Array[]>([]); 
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioGainNodeRef = useRef<GainNode | null>(null);
  const nextAudioStartTimeRef = useRef<number>(0);
  const audioWorkletBlobUrlRef = useRef<string | null>(null);

  const errorHistoryRef = useRef<ErrorDetail[]>([]);
  const totalSentencesReadRef = useRef<number>(0);
  const totalSentencesSkippedRef = useRef<number>(0);
  const difficultPhonemesAcrossSession = useRef<Set<string>>(new Set());

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

  const cleanupAudioResources = useCallback(async () => {
    playingAudioSourcesRef.current.forEach(source => source.stop());
    playingAudioSourcesRef.current.clear();
    nextAudioStartTimeRef.current = 0;

    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.port.onmessage = null;
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
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
    setIsCurrentSentenceSuccess(false);
    setIsLoading(false);
  }, [cleanupAudioResources]);

  const triggerSessionEnd = useCallback(async () => {
    if (!difficultyLevel) return;
    
    setIsLoading(true);
    setLoadingMessage("Speech Pal is polishing your badge...");
    await cleanupAudioResources();
    
    const totalErrors = errorHistoryRef.current.reduce((acc, curr) => acc + curr.errors.length, 0);
    let difficultSoundsAnalysis = "Great effort! ";
    if (difficultPhonemesAcrossSession.current.size > 0) {
      difficultSoundsAnalysis += "Keep practicing: " + Array.from(difficultPhonemesAcrossSession.current).map(s => `'${s}'`).join(', ');
    } else {
      difficultSoundsAnalysis += "You have excellent articulation.";
    }

    const reportSummary = `Total Sentences: ${totalSentencesInSession}. Errors: ${totalErrors}. Target Sounds: ${targetPhonemes.join(', ')}. Skips: ${totalSentencesSkippedRef.current}. ${difficultSoundsAnalysis}`;
    
    let qualitativeAnalysis = "The student completed their practice session with focus.";
    try {
      qualitativeAnalysis = await geminiService.generateQualitativeAnalysis(reportSummary, difficultyLevel);
    } catch (error) {
      console.error("Qualitative analysis failed, using fallback", error);
    }

    setReportData({
      totalSentencesInSession,
      totalSentencesRead: totalSentencesReadRef.current,
      totalSentencesSkipped: totalSentencesSkippedRef.current,
      totalErrors,
      errorHistory: [...errorHistoryRef.current],
      difficultSoundsAnalysis,
      qualitativeAnalysis,
      sentenceType: chosenSentenceType,
      targetPhonemes: [...targetPhonemes],
      difficultyLevel,
    });
    
    setSessionState(SessionState.REPORT);
    setIsLoading(false);
  }, [totalSentencesInSession, chosenSentenceType, targetPhonemes, difficultyLevel, cleanupAudioResources]);

  const startPracticeSession = useCallback(async (numSentences: number, type: SentenceType, phonemes: string[]) => {
    if (!difficultyLevel) return;
    
    setIsLoading(true);
    setLoadingMessage("Generating unique sentences...");
    setSessionState(SessionState.LOADING);
    
    try {
      const sentences = await geminiService.generateSentences(numSentences, difficultyLevel, phonemes, type);
      
      setTotalSentencesInSession(sentences.length);
      setChosenSentenceType(type); 
      setTargetPhonemes(phonemes);
      setCurrentSentenceList(sentences);
      setCurrentSentenceIndex(0);
      totalSentencesReadRef.current = 0;
      totalSentencesSkippedRef.current = 0;
      errorHistoryRef.current = [];
      difficultPhonemesAcrossSession.current = new Set();
      setIsCurrentSentenceSuccess(false);
      
      const stream = await requestMicrophone(); 
      if (stream) {
        stream.getTracks().forEach(track => track.stop()); 
        setSessionState(SessionState.PRACTICE);
        setIsLoading(false);
      } else {
        setSessionState(SessionState.MICROPHONE_DENIED);
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
      setSessionState(SessionState.CHOOSING_DURATION);
    }
  }, [requestMicrophone, difficultyLevel]);

  const currentSentence = currentSentenceList[currentSentenceIndex];

  const moveToNextSentence = useCallback(() => {
    setIsCurrentSentenceSuccess(false);

    if (totalSentencesReadRef.current + totalSentencesSkippedRef.current >= totalSentencesInSession) {
      triggerSessionEnd();
      return;
    }
    
    if (currentSentenceIndex + 1 >= currentSentenceList.length) {
      triggerSessionEnd();
      return;
    }
    
    setCurrentSentenceIndex(prev => prev + 1);
    setRecognitionAttemptCount(0); 
    setErrorDetailsForDisplay([]); 
    setSpokenTranscription('');
    setCurrentSentenceFeedback(''); 
  }, [currentSentenceList.length, currentSentenceIndex, triggerSessionEnd, totalSentencesInSession]);

  const handleSkipSentence = useCallback(() => {
    totalSentencesSkippedRef.current++;
    moveToNextSentence();
  }, [moveToNextSentence]);

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
    if (!difficultyLevel) return;
    setIsLoading(true);
    setLoadingMessage("Analyzing speech...");

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
      });
      const audioBase64 = await base64Promise;
      const analysisResult = await geminiService.analyzePronunciation(currentSentence, audioBase64, targetPhonemes, difficultyLevel);
      
      setIsLoading(false);

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

      handleReadAloud(analysisResult.overallFeedback, FAST_SPEECH_RATE);
      
      if (analysisResult.detailedErrors.length === 0) {
        totalSentencesReadRef.current++; 
        setIsCurrentSentenceSuccess(true);
      } else {
        setRecognitionAttemptCount(prev => prev + 1);
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  }, [currentSentence, recognitionAttemptCount, targetPhonemes, difficultyLevel, handleReadAloud]);

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
      playingAudioSourcesRef.current.forEach(source => source.stop());
      playingAudioSourcesRef.current.clear();
      setIsSpeaking(false);

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

  const togglePhoneme = (phoneme: string) => {
    setTargetPhonemes(prev => 
      prev.includes(phoneme) 
        ? prev.filter(p => p !== phoneme) 
        : [...prev, phoneme]
    );
  };

  const renderContent = () => {
    switch (sessionState) {
      case SessionState.CHOOSING_DIFFICULTY:
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl max-w-2xl mx-auto animate-fadeIn text-center">
            <h2 className="text-4xl font-black text-purple-900 mb-2">Step 1</h2>
            <p className="text-gray-600 mb-8 font-medium italic">Select your Difficulty Level</p>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 w-full mb-10">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((level) => {
                const isSelected = difficultyLevel === level;
                return (
                  <button 
                    key={level}
                    onClick={() => { setDifficultyLevel(level as DifficultyLevel); }}
                    className={`group flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 border-2 shadow-sm ${
                      isSelected 
                        ? 'bg-purple-600 border-purple-600 scale-105' 
                        : 'bg-purple-50 border-purple-100 hover:border-purple-600 hover:bg-purple-100'
                    }`}
                  >
                    <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-purple-800'}`}>{level}</span>
                    <span className={`text-[10px] uppercase font-bold ${isSelected ? 'text-purple-100' : 'text-purple-400'}`}>Level</span>
                  </button>
                );
              })}
            </div>

            <Button 
              className={`w-full py-5 text-2xl font-black uppercase tracking-widest shadow-xl transition-all duration-300 ${!difficultyLevel ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
              onClick={() => difficultyLevel && setSessionState(SessionState.CHOOSING_PHONEME)}
              disabled={!difficultyLevel}
            >
              Next
            </Button>
          </div>
        );

      case SessionState.CHOOSING_PHONEME:
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl max-w-2xl mx-auto animate-fadeIn text-center">
             <div className="flex items-center space-x-2 mb-4">
              <button onClick={() => setSessionState(SessionState.CHOOSING_DIFFICULTY)} className="text-purple-600 hover:underline text-xs font-bold uppercase tracking-widest">← Back to Levels</button>
            </div>
            <h2 className="text-4xl font-black text-purple-900 mb-2">Step 2</h2>
            <p className="text-gray-600 mb-8 font-medium italic">Select Target Sounds (Choose 1 or more)</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mb-10">
              {[
                { type: PhonemeType.R, label: 'R Sound', color: 'purple' },
                { type: PhonemeType.S_Z, label: 'S/Z Sound', color: 'blue' },
                { type: PhonemeType.SH, label: 'Sh Sound', color: 'indigo' },
                { type: PhonemeType.CH, label: 'Ch Sound', color: 'rose' },
                { type: PhonemeType.J, label: 'J Sound', color: 'emerald' },
                { type: PhonemeType.L, label: 'L Sound', color: 'sky' },
                { type: PhonemeType.TH, label: 'TH Sound', color: 'amber' },
              ].map((item) => {
                const isSelected = targetPhonemes.includes(item.type);
                const colors = {
                  blue: isSelected ? 'bg-blue-600 border-blue-600' : 'bg-blue-50 border-blue-100 hover:bg-blue-100 hover:border-blue-600',
                  purple: isSelected ? 'bg-purple-600 border-purple-600' : 'bg-purple-50 border-purple-100 hover:bg-purple-100 hover:border-purple-600',
                  indigo: isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-600',
                  rose: isSelected ? 'bg-rose-600 border-rose-600' : 'bg-rose-50 border-rose-100 hover:bg-rose-100 hover:border-rose-600',
                  emerald: isSelected ? 'bg-emerald-600 border-emerald-600' : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-600',
                  sky: isSelected ? 'bg-sky-600 border-sky-600' : 'bg-sky-50 border-sky-100 hover:bg-sky-100 hover:border-sky-600',
                  amber: isSelected ? 'bg-amber-600 border-amber-600' : 'bg-amber-50 border-amber-100 hover:bg-amber-100 hover:border-amber-600',
                };
                const textColors = {
                  blue: isSelected ? 'text-white' : 'text-blue-800',
                  purple: isSelected ? 'text-white' : 'text-purple-800',
                  indigo: isSelected ? 'text-white' : 'text-indigo-800',
                  rose: isSelected ? 'text-white' : 'text-rose-800',
                  emerald: isSelected ? 'text-white' : 'text-emerald-800',
                  sky: isSelected ? 'text-white' : 'text-sky-800',
                  amber: isSelected ? 'text-white' : 'text-amber-800',
                };
                const subtextColors = {
                  blue: isSelected ? 'text-blue-100' : 'text-blue-400',
                  purple: isSelected ? 'text-purple-100' : 'text-purple-400',
                  indigo: isSelected ? 'text-indigo-100' : 'text-indigo-400',
                  rose: isSelected ? 'text-rose-100' : 'text-rose-400',
                  emerald: isSelected ? 'text-emerald-100' : 'text-emerald-400',
                  sky: isSelected ? 'text-sky-100' : 'text-sky-400',
                  amber: isSelected ? 'text-amber-100' : 'text-amber-400',
                };

                return (
                  <button 
                    key={item.type}
                    onClick={() => togglePhoneme(item.type)}
                    className={`group flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border-2 shadow-sm ${colors[item.color as keyof typeof colors]} ${isSelected ? 'scale-105' : ''}`}
                  >
                    <span className={`text-2xl font-black ${textColors[item.color as keyof typeof textColors]}`}>{item.type}</span>
                    <span className={`text-[10px] font-bold mt-1 uppercase tracking-widest ${subtextColors[item.color as keyof typeof subtextColors]}`}>{item.label}</span>
                  </button>
                );
              })}
              
              <button 
                onClick={() => {
                   const all = Object.values(PhonemeType);
                   if (targetPhonemes.length === all.length) setTargetPhonemes([]);
                   else setTargetPhonemes(all);
                }}
                className={`group flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border-2 shadow-sm bg-slate-50 border-slate-100 hover:bg-slate-100 hover:border-slate-400`}
              >
                <span className={`text-2xl font-black text-slate-800`}>∞</span>
                <span className={`text-[10px] font-bold mt-1 uppercase tracking-widest text-slate-400`}>
                  {targetPhonemes.length === Object.values(PhonemeType).length ? 'Clear All' : 'Select All'}
                </span>
              </button>
            </div>

            <Button 
              className={`w-full py-5 text-2xl font-black uppercase tracking-widest shadow-xl ring-offset-2 ring-purple-600 hover:scale-105 active:scale-95 ${targetPhonemes.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
              disabled={targetPhonemes.length === 0}
              onClick={() => setSessionState(SessionState.CHOOSING_DURATION)}
            >
              Next
            </Button>
          </div>
        );

      case SessionState.CHOOSING_DURATION:
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl max-w-2xl mx-auto animate-fadeIn text-center">
            <div className="flex items-center space-x-2 mb-4">
              <button onClick={() => setSessionState(SessionState.CHOOSING_PHONEME)} className="text-purple-600 hover:underline text-xs font-bold uppercase tracking-widest">← Back to Sound</button>
              <span className="text-gray-300">|</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Level {difficultyLevel} / {targetPhonemes.length} Sounds</span>
            </div>
            <h2 className="text-4xl font-black text-purple-900 mb-2">Step 3</h2>
            <p className="text-gray-600 mb-8 font-medium italic">Finalize Session Details</p>
            
            <div className="w-full mb-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Style</p>
              <div className="flex flex-col md:flex-row gap-3">
                <Button className="flex-1 py-4" onClick={() => setChosenSentenceType(SentenceType.CONVERSATIONAL)} variant={chosenSentenceType === SentenceType.CONVERSATIONAL ? 'primary' : 'secondary'}>
                  Conversational
                </Button>
                <Button className="flex-1 py-4" onClick={() => setChosenSentenceType(SentenceType.TONGUE_TWISTER)} variant={chosenSentenceType === SentenceType.TONGUE_TWISTER ? 'primary' : 'secondary'}>
                  Tongue Twisters
                </Button>
              </div>
            </div>

            <div className="w-full mb-10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">How Many Sentences?</p>
              <div className="flex flex-row gap-3 justify-center">
                <Button className="px-10" onClick={() => setTotalSentencesInSession(10)} variant={totalSentencesInSession === 10 ? 'primary' : 'secondary'}>10</Button>
                <Button className="px-10" onClick={() => setTotalSentencesInSession(20)} variant={totalSentencesInSession === 20 ? 'primary' : 'secondary'}>20</Button>
              </div>
            </div>

            <Button className="w-full py-5 text-2xl font-black uppercase tracking-widest shadow-xl ring-offset-2 ring-purple-600 hover:scale-105 active:scale-95" onClick={() => startPracticeSession(totalSentencesInSession, chosenSentenceType, targetPhonemes)}>
              Start Practice!
            </Button>
          </div>
        );
      case SessionState.PRACTICE:
        const progressPercentage = ((totalSentencesReadRef.current + totalSentencesSkippedRef.current) / totalSentencesInSession) * 100;
        return (
          <div className="flex flex-col items-center justify-between h-full w-full p-4 md:p-8">
            <div className="flex flex-col items-center w-full max-w-4xl">
               <div className="flex justify-between items-end w-full mb-1 px-1">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500">Practice Progress</span>
                 <span className="text-xs font-bold text-purple-700">{totalSentencesReadRef.current + totalSentencesSkippedRef.current} / {totalSentencesInSession}</span>
               </div>
               <div className="w-full bg-slate-200 rounded-full h-2 shadow-inner overflow-hidden mb-4">
                 <div 
                   className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full transition-all duration-1000 ease-out" 
                   style={{ width: `${progressPercentage}%` }}
                 ></div>
               </div>
               <div className="flex space-x-2">
                 <p className={`text-sm font-bold ${ACCENT_BLUE} uppercase tracking-tight`}>Try: {recognitionAttemptCount + 1} / 3</p>
                 <span className="text-slate-300">|</span>
                 {targetPhonemes.length > 0 && (
                   <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-bold uppercase">
                     {targetPhonemes.length > 2 ? `${targetPhonemes.slice(0, 2).join(', ')}...` : targetPhonemes.join(', ')} Sound(s)
                   </span>
                 )}
                 <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase">
                   Level {difficultyLevel}
                 </span>
               </div>
            </div>
            
            <div className="flex-grow flex flex-col items-center justify-center w-full max-w-4xl bg-white border-2 border-slate-50 rounded-[40px] p-8 md:p-12 shadow-2xl animate-fadeIn relative overflow-hidden my-6">
              {isLoading && !isRecording ? ( 
                <LoadingSpinner message={loadingMessage} />
              ) : (
                <>
                  <FeedbackDisplay sentence={currentSentence} errorWords={errorDetailsForDisplay.map(err => err.word)} />
                  {currentSentenceFeedback && ( 
                    <div className="mt-10 p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border-l-4 border-indigo-400 text-indigo-900 rounded-2xl shadow-sm animate-slideUp w-full max-w-2xl mx-auto">
                      <p className="text-base md:text-lg font-medium text-center leading-relaxed italic">"{currentSentenceFeedback}"</p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 bg-white/80 backdrop-blur-md shadow-[0_-10px_40px_rgba(0,0,0,0.03)] flex justify-center items-center space-x-6 md:space-x-12 z-40 border-t border-slate-100">
              <div className="flex items-center space-x-6">
                {!isCurrentSentenceSuccess ? (
                  <>
                    <ReadAloudButton onReadAloud={() => handleReadAloud(currentSentence, SLOWER_SPEECH_RATE)} isSpeaking={isSpeaking} disabled={isRecording || isLoading} />
                    <MicrophoneButton onToggleRecord={handleToggleRecord} isRecording={isRecording} disabled={isSpeaking || isLoading} />
                    <button 
                      onClick={handleSkipSentence}
                      disabled={isRecording || isSpeaking || isLoading}
                      className="px-8 py-3 rounded-2xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 font-black uppercase text-xs tracking-[0.2em] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Skip →
                    </button>
                  </>
                ) : (
                  <Button 
                    onClick={moveToNextSentence} 
                    className="px-12 py-4 text-xl font-bold bg-green-600 hover:bg-green-700 animate-scaleIn shadow-lg ring-2 ring-green-100 ring-offset-4 rounded-full"
                  >
                    {totalSentencesReadRef.current + totalSentencesSkippedRef.current >= totalSentencesInSession 
                      ? "Finish Session 🎉" 
                      : "Next Sentence →"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      case SessionState.LOADING: return <LoadingSpinner message={loadingMessage} className="flex-grow" />;
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header sessionState={sessionState} onExitSession={handleExitSession} />
      <main className="flex-grow flex items-center justify-center p-4">{renderContent()}</main>
    </div>
  );
};

export default App;
