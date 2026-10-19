const test = require('node:test');
const assert = require('node:assert/strict');
const { renderPublishingEditorialProposal: render } = require('../src/generated/communications/jm1-enterprise-communication-renderer');
const fixture = () => ({ subject: 'Re: Example Book consultation', authorName: 'Example Author', title: 'Example Book',
  reviewedVersion: 'Working copy 4 and proposal 5', opening: 'Here are my recommendations for your review.',
  settledDecisions: 'Your three settled placements remain unchanged.', replyInstruction: 'Reply with A or B and any exceptions.',
  materialsUrl: 'https://example.org/materials', materialsLabel: 'View the manuscript and comparison', templateVersion: '5',
  decisions: [{ label: 'A', current: 'Day 1: First', recommendation: 'Day 1: Second', readerBenefit: 'Introduce rest before action.',
    displacedTreatment: 'Preserve First in the archive pending your decision.', authorChoice: 'Approve or hold A.' }] });
test('author proposal includes every decision field and descriptive link in both profiles', () => {
  const r = render(fixture());
  for (const field of Object.values(fixture().decisions[0])) { assert.ok(r.text.includes(field)); assert.ok(r.html.includes(field)); }
  assert.ok(r.text.includes('View the manuscript and comparison: https://example.org/materials'));
  assert.match(r.html, />View the manuscript and comparison<\/a>/);
  assert.match(r.text, /does not approve completion or advancement/);
  assert.ok(!r.text.includes('February')); assert.ok(!r.text.includes('Open Your Secure Link'));
});
test('missing disposition, review version, mismatch and duplicate choices fail closed', () => {
  for (const key of ['current','recommendation','readerBenefit','displacedTreatment','authorChoice']) {
    const f=fixture(); f.decisions[0][key]=''; assert.throws(()=>render(f));
  }
  assert.throws(()=>render({...fixture(),reviewedVersion:''}));
  assert.throws(()=>render({...fixture(),subject:'Other title'}), /TITLE_MISMATCH/);
  const f=fixture(); f.decisions.push(f.decisions[0]); assert.throws(()=>render(f), /DUPLICATE/);
});
test('technical burden is rejected and source text escaped without altering authority', () => {
  assert.throws(()=>render({...fixture(),replyInstruction:'Reconstruct the crosswalk'}), /INTERNAL/);
  const f=fixture();f.decisions[0].recommendation='<script>alert(1)</script>';
  const r=render(f);assert.ok(!r.html.includes('<script>'));assert.ok(r.html.includes('&lt;script&gt;'));
  assert.equal(r.metadata.templateVersion,'5');assert.equal(r.metadata.qualityGate,'PASS');
});
test('oversized proposal is rejected before the relay can truncate plain text',()=>{
  const f=fixture();f.opening='x'.repeat(6000);assert.throws(()=>render(f),/EXCEEDS_RELAY_TEXT_LIMIT/);
});
