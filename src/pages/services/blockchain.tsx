import React from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Link from "next/link";

export default function BlockchainPublishing() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />
      <main className="flex-grow py-16 px-6 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Blockchain Publishing
        </h1>

        {/* Intro Paragraph */}
        <p className="text-center max-w-3xl mx-auto text-gray-700 dark:text-gray-300 text-lg mb-12">
          Blockchain technology brings a new era of trust, transparency, and
          ownership to publishing. By decentralizing rights management and
          securing content ownership on-chain, authors can retain greater
          control over their intellectual property, ensure fair royalties, and
          position their work for the future of digital publishing.
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Why Blockchain Publishing */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Why Blockchain?</h2>
            <ul className="space-y-3 text-sm">
              <li>
                <strong>🔒 Immutable Records:</strong> Your authorship and copyrights are
                recorded securely—forever.
              </li>
              <li>
                <strong>💰 Transparent Royalties:</strong> Smart contracts ensure your
                royalty splits are protected and trackable.
              </li>
              <li>
                <strong>🌍 Future-Ready Publishing:</strong> Gain early access to Web3
                integrations, NFTs, and decentralized content.
              </li>
            </ul>
          </div>

          {/* How It Works */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
            <ul className="space-y-3 text-sm">
              <li><strong>Step 1:</strong> Publish your book through J Merrill Publishing.</li>
              <li><strong>Step 2:</strong> We tokenize the metadata and copyright proof on blockchain.</li>
              <li><strong>Step 3:</strong> You receive a unique digital asset and verification certificate for your records.</li>
              <li><strong>Step 4:</strong> Optional Web3 marketplace listing for advanced visibility.</li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center mt-12">
          <Link href="/bookings" legacyBehavior>
            <a className="bg-[#1E90FF] text-white px-6 py-3 rounded-full hover:bg-blue-700 transition">
              Book a Consultation
            </a>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}