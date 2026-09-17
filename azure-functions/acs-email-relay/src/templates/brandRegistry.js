"use strict";

const BRAND_PROFILE_VERSION = "JM1-EMAIL-BRAND-PROFILES-v1.0.0";

const BRAND_PROFILES = Object.freeze({
  PUBLISHING: freezeBrand({
    brandId: "PUBLISHING",
    relayBrand: "JMP",
    displayName: "J Merrill Publishing",
    tokenVersion: "PUBLISHING-EMAIL-v1.0.0",
    status: "ACTIVE",
    publicUrl: "https://www.jmerrill.pub",
    logo: {
      assetId: "JMP-LOGO-PRIMARY-v1",
      url: "https://www.jmerrill.pub/email-assets/jmp-logo-primary-v1-3e695f57e3496d3a.jpg",
      alt: "J Merrill Publishing",
      sha256: "3e695f57e3496d3af439fca2e6c29c3f6931dfd98104d30935c0ace144c312e6"
    },
    footer: "J Merrill Publishing | jmerrill.pub | publishing@jmerrill.one",
    signatureName: "The Publishing Team",
    tokens: {
      "brand.primary": "#1E90FF",
      "brand.secondary": "#6A5ACD",
      "brand.accent": "#A3C4DC",
      "surface.background": "#FFFFFF",
      "surface.muted": "#F7F8FA",
      "text.primary": "#111111",
      "text.muted": "#4A4E58",
      "link.default": "#005FC0",
      "action.primary.background": "#005FC0",
      "action.primary.text": "#FFFFFF",
      "border.subtle": "#E4E6EA",
      "footer.background": "#0F1C2E",
      "footer.text": "#FFFFFF",
      "font.stack": "Arial, Helvetica, sans-serif"
    }
  })
});

function freezeBrand(profile) {
  return Object.freeze({
    ...profile,
    logo: Object.freeze({ ...profile.logo }),
    tokens: Object.freeze({ ...profile.tokens })
  });
}

function getBrandProfile(brandId) {
  const normalized = String(brandId || "").trim().toUpperCase();
  const profile = BRAND_PROFILES[normalized];
  if (!profile || profile.status !== "ACTIVE") {
    return { ok: false, reason: "EMAIL_BRAND_NOT_ACTIVE" };
  }
  return { ok: true, profile };
}

module.exports = {
  BRAND_PROFILE_VERSION,
  getBrandProfile
};
