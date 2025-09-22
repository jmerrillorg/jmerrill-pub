// pages/services/legacy.tsx
import React from "react";
import MetaHead from "../../components/MetaHead";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ServiceDetailLayout from "../../components/ServiceDetailLayout";

export default function LegacyWritingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <MetaHead
        title="Legacy Writing Services | J Merrill Publishing"
        description="Capture your story and preserve it for generations with Legacy Writing services from J Merrill Publishing."
      />

      <Navbar />

      <main className="flex-grow">
        <ServiceDetailLayout
          title="Legacy Writing Services"
          tagline="Turn Life Stories Into Published Keepsakes."
          description="Legacy Writing is more than memoir — it’s a purposeful act of preservation. J Merrill Publishing helps individuals and families document stories, values, and experiences that matter most, turning them into beautifully produced books."
          features={[
            "One-on-one legacy writing consultations",
            "Ghostwriting and transcription services",
            "Story mapping and content structuring",
            "Professional editing and layout",
            "Custom cover design with family input",
            "Ideal for elders, professionals, and milestone moments"
          ]}
          ctaText="Start Your Legacy Project"
          ctaLink="/schedule?brand=publishing"
        />
      </main>

      <Footer />
    </div>
  );
}
