import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Palette, Type, ImageIcon } from "lucide-react";

export default function BrandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow px-6 py-16 text-gray-900 dark:text-gray-100">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Author Branding</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-10">
            Your brand is more than your logo — it&rsquo;s your voice, your message, and your legacy. We help authors build bold, professional, and authentic branding.
          </p>
        </div>

        {/* Feature Cards */}
        <section className="grid gap-6 md:grid-cols-3 text-left max-w-6xl mx-auto">
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <Palette className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Custom Visual Identity</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              Logos, fonts, color palettes, and visual kits created with your genre and audience in mind.
            </p>
          </div>
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <Type className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Brand Voice & Messaging</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              Define how you speak to your readers with compelling bios, taglines, and consistent tone.
            </p>
          </div>
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <ImageIcon className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Social & Website Kits</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              Get a complete set of branded assets ready for use across social media and your author site.
            </p>
          </div>
        </section>

        {/* Additional Info */}
        <div className="mt-20 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Available As:</h2>
          <p className="text-gray-600 dark:text-gray-400">
            This service can be purchased a la carte or bundled with a publishing package. Every author receives a unique brand strategy tailored to their audience.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link href="/join">
            <span className="bg-[#1E90FF] text-white px-6 py-3 rounded-full hover:bg-blue-700 transition cursor-pointer">
              Start Your Brand &rarr;
            </span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}