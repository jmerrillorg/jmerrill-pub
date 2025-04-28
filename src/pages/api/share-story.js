import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // Required for formidable to handle multipart/form-data
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const form = formidable({
    multiples: false,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Error parsing form:", err);
      return res.status(500).json({ error: "Error parsing the form." });
    }

    const { name, bookTitle, testimonial } = fields;
    const photo = files.photo;

    const payload = {
      name,
      bookTitle,
      testimonial,
      ...(photo?.filepath && {
        photoName: photo.originalFilename,
        photoBase64: fs.readFileSync(photo.filepath, { encoding: "base64" }),
      }),
    };

    try {
      const response = await fetch(
        "https://prod-107.westus.logic.azure.com:443/workflows/44a2d71b6b0445e4906ea057b71d96f2/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MtcjBQVxLJXpWeQgaf6Pf0PXwWYqyzN9Cux0_PEkkz4",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Power Automate Error:", errorText);
        return res.status(500).json({ error: "Power Automate webhook failed." });
      }

      return res.status(200).json({ message: "Success" });
    } catch (error) {
      console.error("❌ Unexpected Error:", error);
      return res.status(500).json({ error: "Something went wrong." });
    }
  });
} 