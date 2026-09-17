"use strict";

const { app } = require("@azure/functions");
const { runPaymentElectionCommunicationConsumer } = require("../orchestration/paymentElectionCommunicationConsumer");

app.timer("run-payment-election-communication-consumer", {
  schedule: "30 */5 * * * *",
  handler: async (_timer, context) => {
    const result = await runPaymentElectionCommunicationConsumer({
      maxRequests: Number(process.env.JM1_PAYMENT_ELECTION_COMMUNICATION_MAX_REQUESTS || 10)
    });
    context.info(`Payment-election communication consumer completed; enabled=${result.enabled}; processed=${result.processed}; accepted=${result.accepted}; failed=${result.failed}; cancelled=${result.cancelled}`);
  }
});

module.exports = {};
