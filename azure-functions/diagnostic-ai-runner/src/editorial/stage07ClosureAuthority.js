"use strict";
// Separate amendment: never change the original plan or its paid receipt identities.
const primary = "701c16b72ff107603f0c09acd264434e97146b93b80ba4f175fb7bdbe3515d06";
const continued = "94b46204db5e0e81d739f507c26905f693888949a494d2c4d64463ebe2a90312";
const reference = "JMP-STAGE07-BOUNDED-CLOSURE-20261016-V1";
const correctiveTask = `${continued}/CONSISTENCY_SECTION/4`;
const paidTasks = [correctiveTask, `${continued}/FINAL_SYNTHESIS/0-0`,
  `${primary}/CONSISTENCY_SECTION/31`, `${primary}/FINAL_SYNTHESIS/0-3`, `${primary}/FINAL_SYNTHESIS/1-0`];
module.exports = { reference, primary, continued, correctiveTask, paidTasks, maximumMicroUsd: 2081920 };
