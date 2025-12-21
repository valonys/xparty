import React, { useEffect, useRef, useState } from 'react';
import { getPublicConfig } from '../services/api';

declare global {
  interface Window {
    google?: any;
  }
}

type Props = {
  onCredential: (credential: string) => Promise<void> | void;
};

export const GoogleSignInButton: React.FC<Props> = ({ onCredential }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const bootstrap = async () => {
      // Prefer build-time env for local vite dev, but fall back to server-provided public config on Vercel.
      let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
      if (!clientId) {
        const cfg = await getPublicConfig().catch(() => ({ googleClientId: '' }));
        clientId = cfg.googleClientId;
      }
      if (!clientId) {
        setError('Missing GOOGLE_CLIENT_ID (set it in Vercel Environment Variables → Production, then redeploy)');
        return;
      }

      const render = () => {
        if (!window.google?.accounts?.id || !divRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: any) => {
            try {
              setError('');
              await onCredential(resp.credential);
            } catch (e: any) {
              setError(e?.message ?? 'Login failed');
            }
          },
        });
        window.google.accounts.id.renderButton(divRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 320,
        });
      };

      if (window.google?.accounts?.id) {
        render();
        return;
      }

      const existing = document.querySelector('script[data-gis="1"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', render, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.gis = '1';
      script.onload = render;
      script.onerror = () => setError('Failed to load Google Sign-In');
      document.head.appendChild(script);
    };

    bootstrap().catch((e) => setError(e?.message ?? 'Login init failed'));
  }, [onCredential]);

  return (
    <div className="space-y-2 w-full flex flex-col items-center">
      <div ref={divRef} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};


