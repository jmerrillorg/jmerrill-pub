"use strict";

// Governed source: docs/governance/publishing/PUB-STD-Author-Copy-Policy.md
const AUTHOR_COPY_POLICY = Object.freeze({
  "JMP-PKG-STARTER": Object.freeze({ printAllocation: 5, digitalEntitlement: 1, audioEntitlement: 1 }),
  "JMP-PKG-PRO": Object.freeze({ printAllocation: 10, digitalEntitlement: 1, audioEntitlement: 1 }),
  "JMP-PKG-PREMIER": Object.freeze({ printAllocation: 15, digitalEntitlement: 1, audioEntitlement: 1 }),
  "JM-SIGNATURE-TRACK": Object.freeze({ printAllocation: 15, digitalEntitlement: 1, audioEntitlement: 1 })
});

const PRODUCT_FORM_DELIVERY_CLASS = Object.freeze({
  "PF-01": Object.freeze({ deliveryClass: "PRINT", name: "Paperback" }),
  "PF-02": Object.freeze({ deliveryClass: "PRINT", name: "Hardcover" }),
  "PF-03": Object.freeze({ deliveryClass: "DIGITAL", name: "Standard Ebook" }),
  "PF-04": Object.freeze({ deliveryClass: "AUDIO", name: "Audiobook" }),
  "PF-05": Object.freeze({ deliveryClass: "PRINT", name: "Large Print" }),
  "PF-06": Object.freeze({ deliveryClass: "DIGITAL", name: "Complex-Content Accessibility Edition" }),
  "PF-07": Object.freeze({ deliveryClass: "INACTIVE", name: "Vertical Graphic Edition" }),
  "PF-08": Object.freeze({ deliveryClass: "DIGITAL", name: "Interactive / Multimedia" })
});

function normalizeCode(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function normalizeElection(election) {
  if (typeof election === "string") return { productFormCode: normalizeCode(election) };
  if (election && typeof election === "object") {
    return {
      ...election,
      productFormCode: normalizeCode(election.productFormCode || election.code)
    };
  }
  return { productFormCode: "" };
}

function isScopeApproved(code, election, options) {
  if (election.scopeApproved === true || election.scopeApproved === "true") return true;
  const approved = Array.isArray(options.scopeApprovedProductForms) ? options.scopeApprovedProductForms.map(normalizeCode) : [];
  return approved.includes(code);
}

function getComplimentaryAllocation(packageCode) {
  const code = typeof packageCode === "string" ? packageCode.trim().toUpperCase() : "";
  return AUTHOR_COPY_POLICY[code] || null;
}

function entitlementForElection(election, allocation, options) {
  const code = election.productFormCode;
  const mapping = PRODUCT_FORM_DELIVERY_CLASS[code];
  if (!mapping) return { error: "PRODUCT_FORM_UNRECOGNIZED", code };
  if (mapping.deliveryClass === "INACTIVE") return { error: "PRODUCT_FORM_INACTIVE_NO_ENTITLEMENT", code };
  if (code === "PF-08" && !isScopeApproved(code, election, options)) {
    return { error: "PF08_SCOPE_APPROVAL_REQUIRED", code };
  }
  if (election.addedLater === true && election.addOnApproved !== true) {
    return { error: "LATER_ADDED_PRODUCT_FORM_ADD_ON_APPROVAL_REQUIRED", code };
  }

  if (mapping.deliveryClass === "PRINT") {
    return {
      productFormCode: code,
      productFormName: mapping.name,
      deliveryClass: "PRINT",
      quantity: allocation.printAllocation,
      unit: "copies",
      label: `${mapping.name}: ${allocation.printAllocation} copies`
    };
  }

  if (mapping.deliveryClass === "DIGITAL") {
    return {
      productFormCode: code,
      productFormName: mapping.name,
      deliveryClass: "DIGITAL",
      quantity: allocation.digitalEntitlement,
      unit: "digital entitlement",
      label: `${mapping.name}: ${allocation.digitalEntitlement} digital entitlement`
    };
  }

  if (mapping.deliveryClass === "AUDIO") {
    return {
      productFormCode: code,
      productFormName: mapping.name,
      deliveryClass: "AUDIO",
      quantity: allocation.audioEntitlement,
      unit: "author delivery",
      label: `${mapping.name}: ${allocation.audioEntitlement} author delivery`
    };
  }

  return { error: "PRODUCT_FORM_DELIVERY_CLASS_UNSUPPORTED", code };
}

function buildLegacySummary(entitlements) {
  const summary = {};
  for (const entitlement of entitlements) {
    const key = entitlement.productFormName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    summary[key] = entitlement.quantity;
    if (entitlement.productFormCode === "PF-03") summary.ebook = entitlement.quantity;
    if (entitlement.productFormCode === "PF-04") summary.audiobook = entitlement.quantity;
  }
  return summary;
}

function computeComplimentaryEntitlements(packageCode, electedProductForms, options = {}) {
  const code = normalizeCode(packageCode);
  const allocation = getComplimentaryAllocation(code);
  const errors = [];

  if (!allocation) errors.push("PACKAGE_ALLOCATION_NOT_DEFINED");
  if (!Array.isArray(electedProductForms) || electedProductForms.length === 0) {
    errors.push("ELECTED_PRODUCT_FORMS_REQUIRED");
  }
  if (errors.length > 0) {
    return { ok: false, errors, packageCode: code, allocation: allocation || null, entitlements: [], complimentaryCopies: null };
  }

  const seen = new Set();
  const entitlements = [];
  for (const rawElection of electedProductForms) {
    const election = normalizeElection(rawElection);
    const productFormCode = election.productFormCode;
    if (!productFormCode) {
      errors.push("PRODUCT_FORM_CODE_REQUIRED");
      continue;
    }
    if (seen.has(productFormCode)) continue;
    seen.add(productFormCode);
    const entitlement = entitlementForElection(election, allocation, options);
    if (entitlement.error) {
      errors.push(`${entitlement.error}:${entitlement.code}`);
      continue;
    }
    entitlements.push(entitlement);
  }

  if (errors.length > 0) {
    return { ok: false, errors, packageCode: code, allocation, entitlements, complimentaryCopies: null };
  }

  return {
    ok: true,
    errors: [],
    packageCode: code,
    allocation,
    entitlements,
    complimentaryCopies: buildLegacySummary(entitlements)
  };
}

module.exports = {
  AUTHOR_COPY_POLICY,
  PRODUCT_FORM_DELIVERY_CLASS,
  computeComplimentaryEntitlements,
  getComplimentaryAllocation
};
