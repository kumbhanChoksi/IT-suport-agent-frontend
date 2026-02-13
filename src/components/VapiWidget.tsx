'use client';

import React, { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';

interface VapiErrorDetails {
  message: string;
  stack?: string;
  type?: string;
  raw?: unknown;
}

interface VapiWidgetProps {
  apiKey?: string;
  assistantId: string;
  config?: Record<string, unknown>;
}

const VapiWidget: React.FC<VapiWidgetProps> = ({ 
  apiKey: apiKeyProp, 
  assistantId, 
}) => {
  const apiKey = apiKeyProp ?? process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? '';
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<Array<{role: string, text: string}>>([]);
  const [lastError, setLastError] = useState<VapiErrorDetails | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    const vapiInstance = new Vapi(apiKey);
    const id = requestAnimationFrame(() => setVapi(vapiInstance));
    return () => {
      cancelAnimationFrame(id);
      vapiInstance?.stop();
    };
  }, [apiKey]);

  useEffect(() => {
    if (vapi == null) return;

    const handleCallStart = () => {
      console.log('Call started');
      setIsConnected(true);
    };
    const handleCallEnd = () => {
      console.log('Call ended');
      setIsConnected(false);
      setIsSpeaking(false);
    };
    const handleSpeechStart = () => {
      console.log('Assistant started speaking');
      setIsSpeaking(true);
    };
    const handleSpeechEnd = () => {
      console.log('Assistant stopped speaking');
      setIsSpeaking(false);
    };
    const handleMessage = (message: { type?: string; role?: string; transcript?: string }) => {
      if (message.type === 'transcript') {
        setTranscript(prev => [...prev, {
          role: message.role ?? 'unknown',
          text: message.transcript ?? ''
        }]);
      }
    };
    const handleError = (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      const details: VapiErrorDetails = {
        message: err.message,
        stack: err.stack,
        type: error != null && typeof error === 'object' && 'constructor' in error
          ? (error as { constructor?: { name?: string } }).constructor?.name
          : typeof error,
        raw: error,
      };
      console.error('[Vapi error] full details:', {
        message: details.message,
        stack: details.stack,
        type: details.type,
        raw: details.raw,
      });
      setLastError(details);
    };

    vapi.on('call-start', handleCallStart);
    vapi.on('call-end', handleCallEnd);
    vapi.on('speech-start', handleSpeechStart);
    vapi.on('speech-end', handleSpeechEnd);
    vapi.on('message', handleMessage);
    vapi.on('error', handleError);

    return () => {
      vapi.off('call-start', handleCallStart);
      vapi.off('call-end', handleCallEnd);
      vapi.off('speech-start', handleSpeechStart);
      vapi.off('speech-end', handleSpeechEnd);
      vapi.off('message', handleMessage);
      vapi.off('error', handleError);
      vapi?.stop();
    };
  }, [vapi]);

  const startCall = () => {
    if (vapi) {
      vapi.start(assistantId);
    }
  };

  const endCall = () => {
    if (vapi) {
      vapi.stop();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 1000,
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '12px',
    }}>
      {lastError != null && (
        <div
          style={{
            background: '#1e1e1e',
            color: '#f0f0f0',
            borderRadius: '8px',
            padding: '12px 16px',
            maxWidth: '360px',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            border: '1px solid #333',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ color: '#ff6b6b' }}>Vapi error (debug)</strong>
            <button
              type="button"
              onClick={() => setLastError(null)}
              style={{
                background: 'transparent',
                color: '#888',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '12px',
              }}
            >
              Dismiss
            </button>
          </div>
          <div style={{ marginBottom: '4px' }}><strong>message:</strong> {lastError.message}</div>
          {lastError.type != null && <div style={{ marginBottom: '4px' }}><strong>type:</strong> {lastError.type}</div>}
          {lastError.stack != null && (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '4px 0', fontSize: '11px', color: '#aaa' }}>
              {lastError.stack}
            </pre>
          )}
          <details style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer', color: '#888' }}>Raw object</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '4px', fontSize: '11px', color: '#aaa', maxHeight: '120px', overflow: 'auto' }}>
              {(() => {
                try {
                  return JSON.stringify(lastError.raw, null, 2);
                } catch {
                  return String(lastError.raw);
                }
              })()}
            </pre>
          </details>
        </div>
      )}
      {!isConnected ? (
        <button
          onClick={startCall}
          style={{
            background: '#12A594',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(18, 165, 148, 0.3)',
            transition: 'all 0.3s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(18, 165, 148, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(18, 165, 148, 0.3)';
          }}
        >
          🎤 Talk to Assistant
        </button>
      ) : (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '20px',
          width: '320px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          border: '1px solid #e1e5e9'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: isSpeaking ? '#ff4444' : '#12A594',
                animation: isSpeaking ? 'pulse 1s infinite' : 'none'
              }}></div>
              <span style={{ fontWeight: 'bold', color: '#333' }}>
                {isSpeaking ? 'Assistant Speaking...' : 'Listening...'}
              </span>
            </div>
            <button
              onClick={endCall}
              style={{
                background: '#ff4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              End Call
            </button>
          </div>
          
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            marginBottom: '12px',
            padding: '8px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            {transcript.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                Conversation will appear here...
              </p>
            ) : (
              <>
                {transcript.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: '8px',
                      textAlign: msg.role === 'user' ? 'right' : 'left'
                    }}
                  >
                    <span style={{
                      background: msg.role === 'user' ? '#12A594' : '#333',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      display: 'inline-block',
                      fontSize: '14px',
                      maxWidth: '80%'
                    }}>
                      {msg.text}
                    </span>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VapiWidget;
