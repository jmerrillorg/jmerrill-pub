// File: /pages/privacy.jsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PrivacyRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.push('https://www.jmerrill.one/legal/privacy-policy');
  }, []);
  return null;
}