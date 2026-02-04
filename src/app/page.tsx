'use client';

import { useEffect, useState } from 'react';
import VapiWidget from '@/components/VapiWidget';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function Home() {
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchAssistantId() {
      try {
        const res = await fetch(`${API_BASE}/api/session/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? `Failed to start session (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled && data.assistantId) {
          setAssistantId(data.assistantId);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load assistant');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    fetchAssistantId();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui' }}>
        Loading assistant…
      </div>
    );
  }

  if (error || !assistantId) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui', color: '#c00' }}>
        {error ?? 'Assistant not available'}
      </div>
    );
  }

  return (
    <div>
      <VapiWidget
        apiKey={process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? ''}
        assistantId={assistantId}
      />
    </div>
  );
}
