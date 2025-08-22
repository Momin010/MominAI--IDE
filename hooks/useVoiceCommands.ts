import { useState, useRef, useCallback } from 'react';

declare const window: any;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useVoiceCommands = () => {
    const [voiceStatus, setVoiceStatus] = useState('idle'); // idle, listening, error, denied
    const recognitionRef = useRef<any>(null);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            // The onend handler will take care of cleaning up state.
        }
    }, []);

    const startListening = useCallback((onResult: (transcript: string) => void) => {
        if (!SpeechRecognition) {
            setVoiceStatus('error');
            console.error('Speech recognition not supported in this browser.');
            return;
        }

        // If listening, stop the current one before starting a new one.
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        recognition.onstart = () => setVoiceStatus('listening');
        
        recognition.onend = () => {
            setVoiceStatus('idle');
            recognitionRef.current = null;
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'not-allowed') {
                setVoiceStatus('denied');
            } else {
                setVoiceStatus('error');
            }
            console.error('Speech recognition error:', event.error);
        };
        
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            onResult(transcript);
        };
        
        recognition.start();

    }, []);

    const isListening = voiceStatus === 'listening';

    return { voiceStatus, startListening, stopListening, isListening };
};
