import React, { useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion } from "framer-motion";

const TABS = [
  "Author & Book Info",
  "Format & Manuscript",
  "Cover Design",
  "Publishing & Marketing",
  "Additional Services",
  "Other",
  //"Tax Information", // ✅ NEW FINAL TAB
];

export default function AuthorOnboarding() {
  const [currentTab, setCurrentTab] = useState(0);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedValue = type === "checkbox" ? checked : value;
    console.log("✍️ Field updated:", name, "=", updatedValue);
    setFormData({
      ...formData,
      [name]: updatedValue,
    });
  };

  const handleNext = () => {
    console.log("➡ Next clicked. Moving from tab", currentTab, "to", currentTab + 1);
    if (currentTab < TABS.length - 1) {
      setCurrentTab((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    console.log("⬅ Back clicked. Moving from tab", currentTab, "to", currentTab - 1);
    setCurrentTab((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🚀 Submit button triggered on tab:", currentTab);
    console.table(formData);

    setSubmitting(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      const data = isJson ? await response.json() : await response.text();

      console.log("✅ Response from API:", data);

      if (response.ok) {
        router.push("/success");
        setFormData({});
        setCurrentTab(0);
      } else {
        alert("Submission failed.");
      }
    } catch (error) {
      console.error("❌ Error submitting form:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const yesNoOptions = (
    <>
      <option value="">Select</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </>
  );

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      <main className="flex-grow px-6 py-20 max-w-4xl mx-auto text-gray-900 dark:text-gray-100">
        <h1 className="text-4xl font-bold text-center mb-6">Author Onboarding</h1>

        <div className="flex justify-center flex-wrap gap-2 mb-10">
          {TABS.map((tab, index) => (
            <button
              key={tab}
              onClick={() => {
                console.log("🧭 Navigating directly to tab:", index, tab);
                setCurrentTab(index);
              }}
              className={`px-4 py-2 rounded-full font-medium transition ${
                currentTab === index
                  ? "bg-[#1E90FF] text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {console.log("📄 Rendering tab:", TABS[currentTab])}

            <div className="grid grid-cols-1 gap-6">
             {/* Default content for non-W9 tabs */}
            </div>

            
            
            
            
            
            
            
            
            
            
            
            {currentTab === 0 && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="col-span-1 md:col-span-2">
      <p className="font-semibold mb-1">Author Type</p>
      <select name="authorType" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select Author Type</option>
        <option value="First-time Author">First-time Author</option>
        <option value="Returning Author">Returning Author</option>
        <option value="Experienced with Other Publisher">Experienced with Other Publisher</option>
      </select>
    </div>

    <div>
      <p className="font-semibold mb-1">Pen Name</p>
      <input name="penName" onChange={handleChange} className="p-4 border rounded-xl w-full" />
    </div>

    <div>
      <p className="font-semibold mb-1">Mailing Address</p>
      <input name="mailingAddress" onChange={handleChange} className="p-4 border rounded-xl w-full" />
    </div>

    <div>
      <p className="font-semibold mb-1">Email</p>
      <input type="email" name="email" onChange={handleChange} className="p-4 border rounded-xl w-full" />
    </div>

    <div>
      <p className="font-semibold mb-1">Phone</p>
      <input name="phone" onChange={handleChange} className="p-4 border rounded-xl w-full" />
    </div>

    <div>
      <p className="font-semibold mb-1">Book Title</p>
      <input name="bookTitle" onChange={handleChange} className="p-4 border rounded-xl w-full" />
    </div>

    <div>
      <p className="font-semibold mb-1">Subtitle</p>
      <input name="subtitle" onChange={handleChange} className="p-4 border rounded-xl w-full" />
    </div>

    <div>
      <p className="font-semibold mb-1">Genres</p>
      <select name="genres" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select Genre</option>
        <option value="Fiction">Fiction</option>
        <option value="Non-Fiction">Non-Fiction</option>
        <option value="Spiritual">Spiritual</option>
        <option value="Memoir">Memoir</option>
        <option value="Children’s">Children’s</option>
        <option value="Poetry">Poetry</option>
        <option value="Other">Other</option>
      </select>
    </div>

    <div>
      <p className="font-semibold mb-1">Target Audience</p>
      <input name="targetAudience" onChange={handleChange} className="p-4 border rounded-xl w-full" />
    </div>

    <div className="col-span-1 md:col-span-2">
      <p className="font-semibold mb-1">Short Book Description</p>
      <textarea
        name="shortBookDescription"
        rows={4}
        onChange={handleChange}
        className="p-4 border rounded-xl w-full"
      />
    </div>
  </div>
)}
{currentTab === 1 && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <p className="font-semibold mb-1">Format Preferences</p>
      <label className="block"><input type="checkbox" name="formatPreferences" value="Paperback" onChange={handleChange} /> Paperback</label>
      <label className="block"><input type="checkbox" name="formatPreferences" value="eBook" onChange={handleChange} /> eBook</label>
      <label className="block"><input type="checkbox" name="formatPreferences" value="Hardcover" onChange={handleChange} /> Hardcover</label>
      <label className="block"><input type="checkbox" name="formatPreferences" value="Audio" onChange={handleChange} /> Audio Only</label>
    </div>

    <div>
      <p className="font-semibold mb-1">Cover Type</p>
      <select name="coverType" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select</option>
        <option value="Glossy">Glossy</option>
        <option value="Matte">Matte</option>
      </select>
    </div>

    <div>
      <p className="font-semibold mb-1">Trim Size</p>
      <select name="trimSize" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select</option>
        <option value="5x8">5” x 8”</option>
        <option value="5.5x8.5">5.5” x 8.5”</option>
        <option value="6x9">6” x 9”</option>
        <option value="7x10">7” x 10”</option>
        <option value="8.5x11">8.5” x 11”</option>
        <option value="Custom">Custom Size</option>
      </select>
    </div>

    {formData.trimSize === "Custom" && (
      <div>
        <p className="font-semibold mb-1">Custom Trim Size</p>
        <input name="customTrimSize" placeholder="Enter custom size" onChange={handleChange} className="p-4 border rounded-xl w-full" />
      </div>
    )}

    <div>
      <p className="font-semibold mb-1">Word Count</p>
      <input name="wordCount" placeholder="Word Count" onChange={handleChange} className="p-4 border rounded-xl w-full" />
    </div>

    <div>
      <p className="font-semibold mb-1">Contains Images</p>
      <select name="containsImages" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>

    {formData.containsImages === "true" && (
      <div>
        <p className="font-semibold mb-1">Image Count</p>
        <input name="imageCount" placeholder="Image Count" onChange={handleChange} className="p-4 border rounded-xl w-full" />
      </div>
    )}

    <div>
      <p className="font-semibold mb-1">Manuscript Professionally Edited</p>
      <select name="manuscriptEdited" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
  </div>
)}
{currentTab === 2 && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <p className="font-semibold mb-1">Do You Have an Existing Cover?</p>
      <select name="existingCover" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>

    <div>
      <p className="font-semibold mb-1">Do You Need Cover Design?</p>
      <select name="needCoverDesign" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>

    <div className="md:col-span-2">
      <p className="font-semibold mb-1">Cover Color Preferences</p>
      <input
        name="coverColorPreferences"
        placeholder="e.g., Blue with white text"
        onChange={handleChange}
        className="p-4 border rounded-xl w-full"
      />
    </div>

    <div className="md:col-span-2">
      <p className="font-semibold mb-1">Cover Inspiration</p>
      <textarea
        name="coverInspiration"
        placeholder="Describe any ideas, concepts, or books you love"
        rows={4}
        onChange={handleChange}
        className="p-4 border rounded-xl w-full"
      />
    </div>
  </div>
)}
{currentTab === 3 && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <p className="font-semibold mb-1">Has Preferred Release Date?</p>
      <select name="hasReleaseDate" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>

    {formData.hasReleaseDate === "true" && (
      <div>
        <p className="font-semibold mb-1">Preferred Release Date</p>
        <input name="preferredReleaseDate" type="date" onChange={handleChange} className="p-4 border rounded-xl w-full" />
      </div>
    )}

    <div>
      <p className="font-semibold mb-1">Need Marketing Assistance?</p>
      <select name="needMarketingHelp" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>

    <div>
      <p className="font-semibold mb-1">Enable Pre-Order?</p>
      <select name="enablePreOrder" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>

    <div>
      <p className="font-semibold mb-1">Need Author Copies?</p>
      <select name="needAuthorCopies" onChange={handleChange} className="p-4 border rounded-xl w-full">
        <option value="">Select</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </div>
  </div>
)}
{currentTab === 4 && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {[
      "professionalEditing",
      "interiorFormatting",
      "audiobookProduction",
      "authorWebsite",
      "bookTrailer",
      "launchEventPlanning",
      "foreignTranslation",
      "coverDesign",
      "ebookProduction",
      "blockchainPublishing",
      "marketingPR",
      "authorMerchandising",
      "bookTourPlanning",
      "ongoingMarketingSupport"
    ].map((name) => (
      <label key={name} className="flex items-center space-x-3">
        <input
          type="checkbox"
          name={name}
          checked={formData[name] || false}
          onChange={handleChange}
        />
        <span className="capitalize">{name.replace(/([A-Z])/g, " $1")}</span>
      </label>
    ))}

    <div className="md:col-span-2">
      <p className="font-semibold mb-1">Other Service Requests</p>
      <textarea
        name="otherServiceRequests"
        placeholder="List any additional services you’d like to request"
        rows={4}
        onChange={handleChange}
        className="p-4 border rounded-xl w-full"
      />
    </div>
  </div>
)}
{currentTab === 5 && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <textarea
      name="notes"
      placeholder="Notes"
      rows={3}
      onChange={handleChange}
      className="p-4 border rounded-xl w-full md:col-span-2"
    />
    <select
      name="referralSource"
      onChange={handleChange}
      className="p-4 border rounded-xl w-full"
    >
      <option value="">Select Referral Source</option>
      <option value="Google">Google</option>
      <option value="Social Media">Social Media</option>
      <option value="Word of Mouth">Word of Mouth</option>
      <option value="Returning Author">Returning Author</option>
      <option value="Other">Other</option>
    </select>
    <textarea
      name="additionalComments"
      placeholder="Additional Comments"
      rows={3}
      onChange={handleChange}
      className="p-4 border rounded-xl w-full md:col-span-2"
    />
  </div>
)}









</motion.div>

<div className="flex justify-between pt-8">
  {currentTab > 0 ? (
    <button
      type="button"
      onClick={handleBack}
      className="text-gray-600 hover:text-black dark:hover:text-white"
    >
      ⬅ Back
    </button>
  ) : (
    <div></div>
  )}

  {currentTab < TABS.length - 1 ? (
    <button
      type="button"
      onClick={handleNext}
      className="bg-[#1E90FF] text-white px-6 py-2 rounded-full"
    >
      Next ➡
    </button>
  ) : (
    <button
      type="button"
      onClick={handleSubmit} // ✅ Explicit submit action
      className="bg-green-600 text-white px-6 py-2 rounded-full"
      disabled={submitting}
    >
      {submitting ? "Submitting..." : "Submit"}
    </button>
  )}
</div>
</form>
</main>
<Footer />
</div>
);
} 