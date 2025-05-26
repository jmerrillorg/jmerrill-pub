// /pages/financial/setup.jsx
import React, { useState } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import W9Form from "../../components/ui/W9Form";
import RoyaltyPreferencesForm from "../../components/ui/RoyaltyPreferencesForm";

export default function FinancialSetup() {
  const [currentTab, setCurrentTab] = useState("w9");

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      <main className="flex-grow px-6 py-20 max-w-4xl mx-auto text-gray-900 dark:text-gray-100">
        <h1 className="text-4xl font-bold text-center mb-10">Financial Setup</h1>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setCurrentTab("w9")}
            className={`px-4 py-2 rounded-full font-medium transition ${
              currentTab === "w9"
                ? "bg-[#1E90FF] text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            W-9 Form
          </button>
          <button
            onClick={() => setCurrentTab("royalty")}
            className={`px-4 py-2 rounded-full font-medium transition ${
              currentTab === "royalty"
                ? "bg-[#1E90FF] text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            Royalty Preferences
          </button>
        </div>

        {currentTab === "w9" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Submit Your W-9</h2>
            <W9Form authorId="DYNAMIC_GUID_HERE" />
          </div>
        )}

        {currentTab === "royalty" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Royalty Payment Preferences</h2>
            <RoyaltyPreferencesForm authorId="DYNAMIC_GUID_HERE" />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
} 
