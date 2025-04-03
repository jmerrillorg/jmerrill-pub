import React from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <Navbar />
      <main className="flex-grow px-6 py-16 max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-10">Pricing</h1>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#1E90FF] mb-2">Annual Subscription</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Starting at <strong>$4,000/year</strong>
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Up to 6 publishing projects annually</li>
              <li>Priority onboarding & scheduling</li>
              <li>Includes editing, layout, ISBN, distribution</li>
            </ul>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#1E90FF] mb-2">Publishing Packages</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Starting at <strong>$1,500</strong>
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Basic, Standard, Premium & VIP packages</li>
              <li>Editing, interior & cover layout</li>
              <li>Global print & eBook distribution</li>
            </ul>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#1E90FF] mb-2">A La Carte Services</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Custom pricing based on your needs</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Professional Editing</li>
              <li>Audiobook Production</li>
              <li>Marketing & Launch Kits</li>
              <li>Ghostwriting & Developmental Support</li>
            </ul>
          </div>
        </div>
        <div className="text-center mt-12">
          <Link href="/bookings" legacyBehavior>
            <a className="inline-block bg-[#1E90FF] text-white px-6 py-2 rounded-full hover:bg-blue-700 transition">
              Book a Consultation
            </a>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}