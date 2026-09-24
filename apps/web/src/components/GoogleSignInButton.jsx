import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Loaded once and cached at module scope - Login and Signup can both
// mount a GoogleSignInButton without requesting the script twice.
let scriptPromise = null;
function loadGoogleScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// Renders Google's own button via Google Identity Services (GIS) - no npm
// dependency needed for this, matching the app's existing small-dependency
// footprint. Renders nothing at all (not a disabled placeholder) when
// VITE_GOOGLE_CLIENT_ID isn't set, since no real Google Cloud OAuth client
// is configured in this environment yet - see apps/web/.env.example.
export function GoogleSignInButton({ onCredential, text = 'continue_with' }) {
  const containerRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return undefined;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onCredentialRef.current(response.credential),
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          width: 320,
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;
  if (failed) return <p className="text-center text-sm text-danger">Google sign-in is unavailable right now.</p>;
  return <div ref={containerRef} className="flex w-full justify-center" />;
}
