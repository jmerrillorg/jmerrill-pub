import React, { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../../lib/authConfig";

const W9Form = ({ authorId }) => {
  const { instance, accounts } = useMsal();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    legalName: "",
    address: "",
    tin: "",
    signature: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const account = accounts[0];
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });

      const res = await fetch(
        "https://jmerrillone.api.crm.dynamics.com/api/data/v9.2/jm1_authortaxinformations",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${response.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jm1_legalname: formData.legalName,
            jm1_addressline1: formData.address,
            jm1_tin: formData.tin,
            jm1_signatureconfirmation: formData.signature,
            jm1_datesigned: new Date().toISOString(),
            "jm1_Contact@odata.bind": `/contacts(${authorId})`, // ✅ Fixed
          }),
        }
      );

      if (res.ok) {
        alert("✅ W-9 submitted successfully!");
        setFormData({
          legalName: "",
          address: "",
          tin: "",
          signature: false,
        });
      } else {
        const error = await res.text();
        console.error("❌ Submission error:", error);
        alert("❌ Submission failed. Please try again.");
      }
    } catch (err) {
      console.error("⚠️ Authentication or submission error:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-semibold">W-9 Tax Information</h3>

      <div>
        <label className="block font-medium mb-1">Legal Name</label>
        <input
          type="text"
          name="legalName"
          value={formData.legalName}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Address</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">TIN (Taxpayer Identification Number)</label>
        <input
          type="password"
          name="tin"
          value={formData.tin}
          onChange={handleChange}
          maxLength="9"
          pattern="[0-9]{9}"
          placeholder="###-##-####"
          required
          className="w-full border px-3 py-2 rounded"
        />
      </div>

      <div>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            name="signature"
            checked={formData.signature}
            onChange={handleChange}
            className="mr-2"
            required
          />
          I confirm this information is accurate.
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-[#1E90FF] text-white px-6 py-2 rounded-full"
      >
        {submitting ? "Submitting..." : "Submit W-9"}
      </button>
    </form>
  );
};

export default W9Form;