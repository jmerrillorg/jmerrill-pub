// File: /pages/terms.jsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TermsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.push('https://www.jmerrill.one/legal/terms-and-conditions');
  }, []);
  return null;
}