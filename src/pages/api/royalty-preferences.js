// /pages/api/royalty-preferences.js

export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method Not Allowed" });
    }
  
    const data = req.body;
  
    // ✅ Basic validation
    if (!data || !data.authorId || !data.paymentMethod) {
      return res.status(400).json({ message: "Missing required fields." });
    }
  
    // 🔗 Your actual Power Automate trigger URL
    const flowUrl = "https://prod-112.westus.logic.azure.com:443/workflows/0616619c38fd48fa93e2f42ecdb71e02/triggers/manual/paths/invoke?api-version=2016-06-01";
  
    try {
      const response = await fetch(flowUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
  
      const result = await response.text();
  
      if (response.ok) {
        return res.status(200).json({ message: "Success", detail: result });
      } else {
        return res.status(502).json({ message: "Flow Error", detail: result });
      }
    } catch (error) {
      console.error("❌ Flow submission error:", error);
      return res.status(500).json({ message: "Server error", error });
    }
  }