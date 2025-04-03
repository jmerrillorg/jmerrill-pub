import React from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Link from "next/link";

export default function FullServicePublishing() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />
      <main className="flex-grow py-16 px-6 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">
          Full-Service Publishing
        </h1>

        <p className="text-center max-w-3xl mx-auto text-gray-700 dark:text-gray-300 text-lg mb-12">
          Full-service publishing means everything—from manuscript to marketplace—is
          professionally handled under one roof. At J Merrill Publishing, we guide
          authors through each step of the journey, including editing, layout, design,
          ISBN registration, publishing, and global distribution. Whether you&rsquo;re a
          first-time author or a seasoned voice, our model is built for those who want
          high-quality outcomes with transparency, creative control, and expert support.
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Publishing Packages */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Publishing Packages</h2>
            <ul className="space-y-3 text-sm">
              <li>
                <strong>📘 Single Book Publishing:</strong> One-time service for authors ready to publish a single title.
              </li>
              <li>
                <strong>📚 Annual Subscription:</strong> Publish up to 6 books per year for a flat rate—ideal for prolific authors or series publishers.
              </li>
              <li>
                <strong>⚙️ Custom / A La Carte:</strong> Choose exactly what you need—editing, layout, audiobook, blockchain, and more.
              </li>
            </ul>
          </div>

          {/* Distribution Info */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">Distribution Partners</h2>
            <ul className="space-y-3 text-sm">
              <li><strong>IngramSpark:</strong> Global print distribution</li>
              <li><strong>Amazon KDP:</strong> Print + eBook (optional)</li>
              <li><strong>CoreSource:</strong> eBook distribution (Apple, B&N, Kobo, etc.)</li>
              <li><strong>Kobo Direct:</strong> Optional direct eBook listing</li>
            </ul>
          </div>
        </div>

        {/* CTA Button */}
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