// pages/services/full-service.tsx
import React from "react";
import MetaHead from "../../components/MetaHead";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ServiceDetailLayout from "../../components/ServiceDetailLayout";

export default function FullServicePublishingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <MetaHead
        title="Full-Service Publishing | J Merrill Publishing"
        description="End-to-end publishing solutions from J Merrill. We handle everything from editing and layout to ISBN registration and global distribution."
      />

      <Navbar />

      <main className="flex-grow">
        <ServiceDetailLayout
          title="Full-Service Publishing"
          tagline="From Manuscript to Marketplace."
          description="J Merrill Publishing offers comprehensive, end-to-end publishing solutions for authors who want to bring their books to life without the stress. We guide you through every step — editing, design, formatting, registration, and distribution — so you can focus on your message."
          features={[
            "Professional editing (copyediting and proofreading)",
            "Custom interior layout and design",
            "ISBN registration and barcode creation",
            "Print and eBook formatting",
            "Ingram Content distribution setup",
            "Publishing timeline guidance and support"
          ]}
          ctaText="Start Your Publishing Journey"
          ctaLink="/schedule?brand=publishing"
        />
      </main>

      <Footer />
    </div>
  );
}
