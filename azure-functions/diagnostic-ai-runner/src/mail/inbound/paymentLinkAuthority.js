"use strict";

function hold(reason) {
  return { status: "UNVERIFIED", reason };
}

async function retrieveStripeInvoice(invoiceId, secret = process.env.STRIPE_CHECKOUT_SECRET_KEY || process.env.STRIPE_SECRET_KEY, fetchImpl = fetch) {
  if (!secret) return hold("STRIPE_READ_CREDENTIAL_MISSING");
  const response = await fetchImpl(`https://api.stripe.com/v1/invoices/${encodeURIComponent(invoiceId)}`, {
    headers: { Authorization: `Bearer ${secret}` }
  });
  if (!response.ok) return hold(response.status === 403 ? "STRIPE_INVOICE_READ_DENIED" : "STRIPE_INVOICE_READ_FAILED");
  return { status: "READ", invoice: await response.json() };
}

async function checkHostedInvoiceUrl(url, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(10000) });
    return response.ok ? { status: "ACCESSIBLE" } : hold("HOSTED_INVOICE_URL_UNREACHABLE");
  } catch {
    return hold("HOSTED_INVOICE_URL_UNREACHABLE");
  }
}

async function validatePaymentLink(client, queueItem, deps = {}) {
  const title = await client.first("jm1pub_titles", {
    $select: "jm1pub_titleid,_jm1pub_contract_value",
    $filter: `jm1pub_titleid eq ${queueItem.titleId}`
  });
  if (!title?._jm1pub_contract_value) return hold("CONTRACT_NOT_BOUND");
  const contract = await client.first("jm1pub_contracts", {
    $select: "jm1pub_contractid,jm1pub_providerstatus,_jm1pub_opportunity_value,_new_author_value",
    $filter: `jm1pub_contractid eq ${title._jm1pub_contract_value}`
  });
  if (contract?._new_author_value !== queueItem.authorId || contract?.jm1pub_providerstatus !== "ADOBE_SIGNED_COMPLETED" || !contract?._jm1pub_opportunity_value) {
    return hold("SIGNED_CONTRACT_AUTHORITY_UNPROVEN");
  }
  const ledger = await client.first("jmpv2_agreementrecords", {
    $select: "jmpv2_agreementrecordid,jmpv2_authoridentity,jmpv2_titleid,jmpv2_agreementkey,jmpv2_stripecustomerid,jmpv2_paymentledgerstatus",
    $filter: `jmpv2_agreementrecordid eq ${contract._jm1pub_opportunity_value}`
  });
  if (ledger?.jmpv2_authoridentity !== queueItem.authorId || ledger?.jmpv2_titleid !== queueItem.titleId ||
      ledger?.jmpv2_agreementkey !== contract._jm1pub_opportunity_value ||
      ledger?.jmpv2_paymentledgerstatus !== "ACTIVE" || !ledger?.jmpv2_stripecustomerid) return hold("PAYMENT_LEDGER_AUTHORITY_UNPROVEN");
  const obligations = await client.list("jmpv2_paymentrequirements", {
    $select: "jmpv2_paymentrequirementid,jmpv2_agreementkey,jmpv2_installmentsequence,jmpv2_amountcents,jmpv2_duedate,jmpv2_obligationstatus,jmpv2_stripeinvoiceid",
    $filter: `jmpv2_agreementkey eq '${contract._jm1pub_opportunity_value.replace(/'/g, "''")}'`,
    $top: "30"
  });
  const upcoming = obligations.filter((row) => row.jmpv2_obligationstatus === "SCHEDULED")
    .sort((a, b) => Number(a.jmpv2_installmentsequence) - Number(b.jmpv2_installmentsequence))[0];
  if (!upcoming?.jmpv2_stripeinvoiceid) return hold("CURRENT_INVOICE_NOT_AVAILABLE");
  const read = await (deps.retrieveStripeInvoice || retrieveStripeInvoice)(upcoming.jmpv2_stripeinvoiceid);
  if (read.status !== "READ") return read;
  const invoice = read.invoice;
  let url;
  try { url = new URL(invoice.hosted_invoice_url); } catch { return hold("HOSTED_INVOICE_URL_MISSING"); }
  if (invoice.id !== upcoming.jmpv2_stripeinvoiceid || invoice.customer !== ledger.jmpv2_stripecustomerid ||
      invoice.status !== "open" || invoice.livemode !== true || invoice.currency !== "usd" ||
      invoice.amount_remaining !== Number(upcoming.jmpv2_amountcents) ||
      url.protocol !== "https:" || url.hostname !== "invoice.stripe.com") return hold("INVOICE_PARITY_FAILED");
  const access = await (deps.checkHostedInvoiceUrl || checkHostedInvoiceUrl)(url.toString());
  if (access.status !== "ACCESSIBLE") return access;
  return {
    status: "VALID",
    url: url.toString(),
    invoiceId: invoice.id,
    installmentSequence: Number(upcoming.jmpv2_installmentsequence),
    amountCents: invoice.amount_remaining,
    agreementId: ledger.jmpv2_agreementrecordid
  };
}

module.exports = { checkHostedInvoiceUrl, retrieveStripeInvoice, validatePaymentLink };
