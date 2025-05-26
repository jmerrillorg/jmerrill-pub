// pages/services/blockchain.tsx
import React from "react";
import MetaHead from "../../components/MetaHead";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ServiceDetailLayout from "../../components/ServiceDetailLayout";

export default function BlockchainServicePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <MetaHead
        title="Blockchain Digital Publishing | J Merrill Publishing"
        description="Future-proof your work with Blockchain Digital Publishing from J Merrill. Secure ownership, automate royalties, and validate authenticity."
      />

      <Navbar />

      <main className="flex-grow">
        <ServiceDetailLayout
          title="Blockchain Digital Publishing"
          tagline="Secure. Trackable. Next-Gen Publishing."
          description="At J Merrill Publishing, we're proud to be one of the first independent publishers to offer blockchain integration as part of our digital publishing services. With blockchain, your work is secured with an immutable timestamp and uniquely identified for life — ensuring authenticity, ownership, and innovation in a changing market."
          features={[
            "Blockchain tokenization of your manuscript",
            "Immutable record of ownership and authorship",
            "Smart contract-enabled royalty tracking",
            "Tamper-proof digital distribution validation",
            "Compatibility with NFT and resale models"
          ]}
          ctaText="Schedule a Blockchain Consultation"
          ctaLink="/schedule?brand=publishing"
        />
      </main>

      <Footer />
    </div>
  );
}