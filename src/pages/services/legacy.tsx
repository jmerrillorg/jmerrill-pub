import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BookMarked, Users, Sparkles } from "lucide-react";

export default function LegacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow px-6 py-16 text-gray-900 dark:text-gray-100">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Legacy Publishing</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-10">
            Your story matters. Our legacy publishing services ensure your voice lives on — for your family, your community, and the world.
          </p>
        </div>

        {/* Feature Cards */}
        <section className="grid gap-6 md:grid-cols-3 text-left max-w-6xl mx-auto">
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <BookMarked className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Memoir & Life Stories</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              Whether you&rsquo;re writing a personal memoir or documenting family history, we&rsquo;ll help preserve it with dignity and care.
            </p>
          </div>
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <Users className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Family & Community Projects</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              Publish tribute books, family cookbooks, or church histories that celebrate shared experiences and heritage.
            </p>
          </div>
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <Sparkles className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Faith & Testimony Projects</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              Capture your testimony, spiritual journey, or sermons as a legacy of faith for future generations.
            </p>
          </div>
        </section>

        {/* Additional Info */}
        <div className="mt-20 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Create Something Eternal</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Our legacy authors range from grandparents preserving their wisdom to leaders sharing their vision. We honor every story with confidentiality, respect, and excellence.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link href="/join">
            <span className="bg-[#1E90FF] text-white px-6 py-3 rounded-full hover:bg-blue-700 transition cursor-pointer">
              Begin Your Legacy &rarr;
            </span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}