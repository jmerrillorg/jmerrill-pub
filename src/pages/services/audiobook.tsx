import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mic, Headphones, Globe2 } from "lucide-react";

export default function AudiobookProductionPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow px-6 py-16 text-gray-900 dark:text-gray-100">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Audiobook Production</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-10">
            Bring your book to life with professionally produced audiobooks — featuring talented voice artists, studio-quality sound, and global distribution.
          </p>
        </div>

        {/* Feature Cards */}
        <section className="grid gap-6 md:grid-cols-3 text-left max-w-6xl mx-auto">
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <Mic className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Professional Narration</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              Choose from a range of talented narrators who match your tone, genre, and message.
            </p>
          </div>
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <Headphones className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Studio-Grade Audio</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              All audiobooks are produced in post-production studios for flawless, immersive sound.
            </p>
          </div>
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <Globe2 className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Global Distribution</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              Distributed on Audible, Apple, Storytel, Kobo, and dozens of other platforms worldwide.
            </p>
          </div>
        </section>

        {/* Additional Info */}
        <div className="mt-20 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Included in Your Publishing Journey</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Audiobook production is available as a standalone service or as part of our Full-Service and Annual Subscription packages. We handle script prep, casting, engineering, and uploads.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link href="/join">
            <span className="bg-[#1E90FF] text-white px-6 py-3 rounded-full hover:bg-blue-700 transition cursor-pointer">
              Start Your Audiobook &rarr;
            </span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}