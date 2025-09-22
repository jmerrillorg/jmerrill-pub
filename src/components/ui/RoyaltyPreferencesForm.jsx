// /components/ui/RoyaltyPreferencesForm.jsx
import React, { useState } from "react";

export default function RoyaltyPreferencesForm({ authorId }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      ...formData,
      authorId
    };

    try {
      const response = await fetch("/api/royalty-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Royalty preferences submitted successfully.");
        setFormData({});
      } else {
        alert("Submission failed. Please try again.");
      }
    } catch (error) {
      console.error("❌ Submission error:", error);
      alert("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block font-semibold mb-1">Preferred Payment Method</label>
        <select
          name="paymentMethod"
          onChange={handleChange}
          value={formData.paymentMethod || ""}
          className="p-4 border rounded-xl w-full"
        >
          <option value="">Select</option>
          <option value="paypal">PayPal</option>
          <option value="directDeposit">Direct Deposit</option>
          <option value="check">Paper Check</option>
        </select>
      </div>

      {formData.paymentMethod === "paypal" && (
        <div>
          <label className="block font-semibold mb-1">PayPal Email</label>
          <input
            type="email"
            name="paypalEmail"
            value={formData.paypalEmail || ""}
            onChange={handleChange}
            className="p-4 border rounded-xl w-full"
          />
        </div>
      )}

      {formData.paymentMethod === "directDeposit" && (
        <>
          <div>
            <label className="block font-semibold mb-1">Bank Name</label>
            <input
              name="bankName"
              value={formData.bankName || ""}
              onChange={handleChange}
              className="p-4 border rounded-xl w-full"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Routing Number</label>
            <input
              name="routingNumber"
              value={formData.routingNumber || ""}
              onChange={handleChange}
              className="p-4 border rounded-xl w-full"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Account Number</label>
            <input
              name="accountNumber"
              value={formData.accountNumber || ""}
              onChange={handleChange}
              className="p-4 border rounded-xl w-full"
            />
          </div>
        </>
      )}

      {formData.paymentMethod === "check" && (
        <div>
          <label className="block font-semibold mb-1">Mailing Address</label>
          <input
            name="mailingAddress"
            value={formData.mailingAddress || ""}
            onChange={handleChange}
            className="p-4 border rounded-xl w-full"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-green-600 text-white px-6 py-2 rounded-full"
      >
        {submitting ? "Submitting..." : "Submit Preferences"}
      </button>
    </form>
  );
}