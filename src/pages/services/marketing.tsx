// pages/services/marketing.tsx
import React from "react";
import MetaHead from "../../components/MetaHead";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ServiceDetailLayout from "../../components/ServiceDetailLayout";

export default function MarketingPromotionPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <MetaHead
        title="Marketing & Promotion | J Merrill Publishing"
        description="Amplify your book launch with targeted marketing and promotion services from J Merrill Publishing."
      />

      <Navbar />

      <main className="flex-grow">
        <ServiceDetailLayout
          title="Marketing & Promotion"
          tagline="Visibility. Momentum. Results."
          description="Publishing is only half the journey. J Merrill Publishing equips authors with strategic marketing tools to help their books get discovered. Our services include digital campaigns, influencer outreach, and bookstore connections that drive results."
          features={[
            "Targeted digital launch campaigns",
            "Press release drafting and distribution",
            "Retail and bookstore placement strategy",
            "Social media calendar and asset kit",
            "Email marketing setup and template",
            "Post-launch support and analytics overview"
          ]}
          ctaText="Book a Marketing Strategy Session"
          ctaLink="/schedule?brand=publishing"
        />
      </main>

      <Footer />
    </div>
  );
}
