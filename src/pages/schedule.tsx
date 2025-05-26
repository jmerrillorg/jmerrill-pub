// pages/schedule.tsx
import React, { useEffect, useState } from "react";
import MetaHead from "../components/MetaHead";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const bookingLinks: Record<string, string> = {
  publishing: "https://outlook.office.com/book/JMerrillPublishingInc@jmerrill.pub/",
  financial: "https://outlook.office.com/book/JMerrillFinancialLLC@jmerrill.pub/",
  foundation: "https://outlook.office.com/owa/calendar/JMerrillFoundationInc2@jmerrill.one/bookings/"
};

export default function SchedulePage() {
  const router = useRouter();
  const { brand = "publishing" } = router.query;
  const [iframeUrl, setIframeUrl] = useState<string>(bookingLinks["publishing"]);

  useEffect(() => {
    const selected = typeof brand === "string" ? brand.toLowerCase() : "publishing";
    const base = bookingLinks[selected] || bookingLinks["publishing"];
    setIframeUrl(base);
  }, [brand]);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <MetaHead
        title="Schedule a Consultation | J Merrill One"
        description="Book your personalized consultation with J Merrill Publishing, Financial, or Foundation."
      />

      <Navbar />

      <main className="flex-grow px-4 pt-10 pb-6 text-gray-900 dark:text-gray-100 text-center">
        <div className="max-w-7xl mx-auto w-full">
          <h1 className="text-4xl font-bold mb-2">Book a Consultation</h1>
          <p className="text-md mb-6 text-gray-600 dark:text-gray-300">
            Schedule your personalized session with our team below. Select your brand and service type as needed.
          </p>

          {/* Brand Selector */}
          <div className="flex justify-center space-x-4 mb-6">
            {Object.keys(bookingLinks).map((b) => (
              <button
                key={b}
                onClick={() => router.push(`/schedule?brand=${b}`)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition border ${
                  brand === b ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300"
                }`}
              >
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>

          {/* Embedded Scheduler */}
          <div className="w-full h-[850px]">
            <iframe
              src={iframeUrl}
              width="100%"
              height="100%"
              allowFullScreen
              frameBorder="0"
              scrolling="yes"
              title="Book a Consultation"
              aria-label="Book a Consultation with J Merrill"
              className="rounded-lg shadow-md"
            ></iframe>
          </div>

          {/* Need Help CTA */}
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Need help choosing a service? {" "}
            <a href="/contact" className="text-blue-600 hover:underline">Contact us</a> or call (614) 965-6057.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
