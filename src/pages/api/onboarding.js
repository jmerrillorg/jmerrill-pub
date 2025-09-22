// /pages/api/onboarding.js

export default async function handler(req, res) {
    // ✅ Restrict to POST only
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }
  
    // 🌐 Replace this with your Power Automate HTTP trigger URL
    const flowUrl =
      "https://prod-66.westus.logic.azure.com:443/workflows/4bd933fe52c94ecaac3ff538170edccf/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=CvgnwmUXRZPHC90xpxbicsvudgQMzCthP5iS1suz4Hs";
  
    try {
      const response = await fetch(flowUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 🔐 Optional: Include if your flow is secured with a custom header
          "x-jm1-key": "secure-secret-key",
        },
        body: JSON.stringify(req.body),
      });
  
      // 🧠 Determine response content type (JSON vs plain text)
      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const result = isJson ? await response.json() : await response.text();
  
      // 🚫 Handle flow response errors
      if (!response.ok) {
        console.error("❌ Power Automate returned an error:", result);
        return res.status(response.status).json({
          message: "Flow returned an error",
          status: response.status,
          result,
        });
      }
  
      // ✅ Success
      return res.status(200).json({
        message: "Submitted successfully!",
        result,
      });
    } catch (err) {
      console.error("❌ Unexpected error submitting to flow:", err.message);
      return res.status(500).json({
        message: "Error submitting onboarding form.",
        error: err.message,
      });
    }
  }
