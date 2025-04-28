// pages/success.jsx
import React from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useRouter } from "next/router";

export default function SuccessPage() {
  const router = useRouter();
  const { name } = router.query; // URL param: ?name=Jackie

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow px-6 py-24 max-w-3xl mx-auto text-center text-gray-900 dark:text-gray-100">
        <h1 className="text-4xl font-bold mb-4">
          🎉 You're All Set{name ? `, ${name}` : ""}!
        </h1>

        <p className="text-lg mb-4">
          Thank you for completing the Author Onboarding process and securely submitting your W-9 Tax Information.
        </p>

        <p className="mb-6">
          Our team will review your submission and reach out with next steps. We’re excited to publish with you!
        </p>

        <div className="mb-10 space-y-4">
          <p className="font-semibold text-lg">📢 Share Your Story</p>
          <p>
            We'd love to highlight your publishing journey. Share your story with us to be featured in our newsletter or on social media!
          </p>
          <Link
            href="/share"
            className="inline-block bg-green-600 text-white px-5 py-2 rounded-full hover:bg-green-700"
          >
            Share Your Story
          </Link>
        </div>

        <div className="flex justify-center flex-wrap gap-6 mb-10 text-base font-medium">
          <a
            href="https://facebook.com/jmerrillpub"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            📘 Follow us on Facebook
          </a>

          <a
            href="https://instagram.com/jmerrillpub"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-500 hover:underline"
          >
            📸 Follow us on Instagram
          </a>

          <a
            href="https://www.linkedin.com/company/jmerrillpub/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-800 hover:underline"
          >
            💼 Connect with us on LinkedIn
          </a>
        </div>

        <Link
          href="/"
          className="inline-block bg-[#1E90FF] text-white px-6 py-3 rounded-full hover:bg-blue-600"
        >
          Return to Homepage
        </Link>
      </main>

      <Footer />
    </div>
  );
}