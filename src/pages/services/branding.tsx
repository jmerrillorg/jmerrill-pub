// pages/services/branding.tsx
import React from "react";
import MetaHead from "../../components/MetaHead";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ServiceDetailLayout from "../../components/ServiceDetailLayout";

export default function BrandingDesignPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <MetaHead
        title="Branding & Design | J Merrill Publishing"
        description="Elevate your author presence with customized branding, visuals, and design services tailored for today's publishing world."
      />

      <Navbar />

      <main className="flex-grow">
        <ServiceDetailLayout
          title="Branding & Design"
          tagline="Visual Identity That Matches Your Voice."
          description="From logos and author websites to media kits and marketing graphics, J Merrill Publishing offers brand-building tools to help you stand out in a competitive literary market."
          features={[
            "Custom logo design and color palette selection",
            "Branded author website and landing pages",
            "Social media templates and post graphics",
            "Print-ready marketing materials",
            "Book launch graphics and promotional banners",
            "Author brand guide PDF (optional add-on)"
          ]}
          ctaText="Schedule Branding Consultation"
          ctaLink="/schedule?brand=publishing"
        />
      </main>

      <Footer />
    </div>
  );
}
