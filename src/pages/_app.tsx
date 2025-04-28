// pages/_app.tsx
import type { AppProps } from "next/app";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "../lib/authConfig";
import "../styles/globals.css";

const pca = new PublicClientApplication(msalConfig);

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MsalProvider instance={pca}>
      <Component {...pageProps} />
    </MsalProvider>
  );
}

export default MyApp;