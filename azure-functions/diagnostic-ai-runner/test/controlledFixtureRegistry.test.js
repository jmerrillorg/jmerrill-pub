"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  ALLOWED_CONTROLLED_FIXTURES,
  CONTROLLED_FIXTURE_DIRECTORY,
  getControlledFixtureFilename,
  getControlledFixturePath,
  loadControlledFixtureBuffer
} = require("../src/controlled/fixtureRegistry");

describe("controlled fixture registry", () => {
  test("declares only txt and docx controlled fixtures", () => {
    assert.deepEqual(ALLOWED_CONTROLLED_FIXTURES, ["txt", "docx"]);
  });

  test("resolves deployable controlled fixture filenames", () => {
    assert.equal(getControlledFixtureFilename("txt"), "synthetic-stage0.txt");
    assert.equal(getControlledFixtureFilename("docx"), "synthetic-stage0.docx");
    assert.equal(getControlledFixtureFilename("pdf"), null);
  });

  test("controlled fixture directory exists in runtime-safe src tree", () => {
    assert.ok(CONTROLLED_FIXTURE_DIRECTORY.includes("/src/fixtures/controlled"));
    assert.equal(fs.existsSync(CONTROLLED_FIXTURE_DIRECTORY), true);
  });

  test("deployable txt fixture exists at runtime-safe path", () => {
    const fixturePath = getControlledFixturePath("txt");
    assert.ok(fixturePath && fixturePath.includes("/src/fixtures/controlled/"));
    assert.equal(fs.existsSync(fixturePath), true);
  });

  test("deployable docx fixture exists at runtime-safe path", () => {
    const fixturePath = getControlledFixturePath("docx");
    assert.ok(fixturePath && fixturePath.includes("/src/fixtures/controlled/"));
    assert.equal(fs.existsSync(fixturePath), true);
  });

  test("loads controlled txt fixture buffer", () => {
    const result = loadControlledFixtureBuffer("txt");
    assert.ok(result.fixturePath.endsWith("synthetic-stage0.txt"));
    assert.ok(Buffer.isBuffer(result.fileBuffer));
    assert.ok(result.fileBuffer.length > 0);
  });
});
