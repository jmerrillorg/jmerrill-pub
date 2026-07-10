"use strict";

const path = require("node:path");
const fs = require("node:fs");

const CONTROLLED_FIXTURE_DIRECTORY = path.join(
  __dirname,
  "..",
  "fixtures",
  "controlled"
);

const ALLOWED_CONTROLLED_FIXTURES = Object.freeze(["txt", "docx"]);

function normalizeFixtureType(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getControlledFixtureFilename(fixtureType) {
  const normalized = normalizeFixtureType(fixtureType);

  if (!ALLOWED_CONTROLLED_FIXTURES.includes(normalized)) {
    return null;
  }

  return `synthetic-stage0.${normalized}`;
}

function getControlledFixturePath(fixtureType) {
  const filename = getControlledFixtureFilename(fixtureType);
  return filename ? path.join(CONTROLLED_FIXTURE_DIRECTORY, filename) : null;
}

function loadControlledFixtureBuffer(fixtureType) {
  const fixturePath = getControlledFixturePath(fixtureType);

  if (!fixturePath) {
    const error = new Error("Controlled synthetic fixture type is invalid.");
    error.safeCode = "INVALID_SYNTHETIC_FIXTURE";
    throw error;
  }

  try {
    return {
      fixturePath,
      fileBuffer: fs.readFileSync(fixturePath)
    };
  } catch {
    const error = new Error("Controlled synthetic fixture is missing from the runtime package.");
    error.safeCode = "CONTROLLED_AI_FIXTURE_NOT_FOUND";
    error.fixturePath = fixturePath;
    throw error;
  }
}

module.exports = {
  ALLOWED_CONTROLLED_FIXTURES,
  CONTROLLED_FIXTURE_DIRECTORY,
  getControlledFixtureFilename,
  getControlledFixturePath,
  loadControlledFixtureBuffer
};
