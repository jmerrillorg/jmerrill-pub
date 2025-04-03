import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Megaphone, Globe, TrendingUp } from "lucide-react";

export default function MarketingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow px-6 py-16 text-gray-900 dark:text-gray-100">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Marketing & Promotion</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-10">
            Publishing is only the beginning. We help you build your brand, grow your audience, and increase book sales across all platforms.
          </p>
        </div>

        {/* Feature Cards */}
        <section className="grid gap-6 md:grid-cols-3 text-left max-w-6xl mx-auto">
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <Megaphone className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Promotional Campaigns</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              Let&rsquo;s get loud. Launch strategic email, social, and PR campaigns tailored to your target audience and goals.
            </p>
          </div>
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <Globe className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Global Distribution Support</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              We help you leverage your listings on Amazon, Barnes & Noble, Google, Apple Books, and dozens more for maximum visibility.
            </p>
          </div>
          <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
            <TrendingUp className="w-8 h-8 mb-3 text-[#1E90FF]" />
            <h3 className="text-xl font-semibold mb-2">Author Brand Building</h3>
            <p className="text-gray-700 text-sm dark:text-gray-300">
              We craft your messaging, visuals, and presence to position you as a thought leader—not just a book owner.
            </p>
          </div>
        </section>

        {/* Additional Info */}
        <div className="mt-20 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Marketing You Can Count On</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Whether you&rsquo;re launching your first book or growing your backlist, our marketing team and industry tools ensure your message is heard.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link href="/join">
            <span className="bg-[#1E90FF] text-white px-6 py-3 rounded-full hover:bg-blue-700 transition cursor-pointer">
              Let&rsquo;s Get You Noticed &rarr;
            </span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}