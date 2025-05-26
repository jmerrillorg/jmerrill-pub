// pages/services/audiobook.tsx
import React from "react";
import MetaHead from "../../components/MetaHead";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ServiceDetailLayout from "../../components/ServiceDetailLayout";

export default function AudiobookProductionPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <MetaHead
        title="Audiobook Production | J Merrill Publishing"
        description="Transform your manuscript into a high-quality audiobook with professional narration and global distribution."
      />

      <Navbar />

      <main className="flex-grow">
        <ServiceDetailLayout
          title="Audiobook Production"
          tagline="Voice That Brings Your Words to Life."
          description="J Merrill Publishing’s Audiobook Production service allows your story to reach audiences in a powerful new way. We provide professional voice talent, full studio editing, and distribution through major audio platforms so you can connect with readers who love to listen."
          features={[
            "Professional narrator options (male/female, various tones)",
            "High-quality studio recording and mastering",
            "Audio format editing and chaptering",
            "Submission to Audible, Amazon, and other major platforms",
            "Cover art adaptation for audio format",
            "Optional author voice version support"
          ]}
          ctaText="Request Audiobook Production"
          ctaLink="/schedule?brand=publishing"
        />
      </main>

      <Footer />
    </div>
  );
}
