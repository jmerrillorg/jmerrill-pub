import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { imprintStrategies, getImprintStrategyBySlug } from '../data/imprints.ts';

test('approved register recognizes six distinct commercial imprints', () => {
  assert.equal(imprintStrategies.length, 6);
  assert.equal(new Set(imprintStrategies.map(x => x.slug)).size, 6);
  assert.equal(getImprintStrategyBySlug('jm-prestige').label, 'JM Prestige');
  assert.match(getImprintStrategyBySlug('jm-prestige').assignmentRule, /quality alone does not/);
  assert.match(getImprintStrategyBySlug('jm-signature').assignmentRule, /not purchasable/);
});

test('public prices distinguish monthly totals from paid annual prices', () => {
  const page = fs.readFileSync(new URL('../app/publishing-partner/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /\$8,000 paid annually; twelve monthly payments total \$9,000/);
  assert.match(page, /\$13,500 paid annually; twelve monthly payments total \$15,000/);
  assert.match(page, /JM Signature is a separate Publisher-designated imprint and is not purchasable/);
});

test('empty Prestige catalog filter remains recognized without assigning a title', () => {
  const source = fs.readFileSync(new URL('../app/books/BooksClient.tsx', import.meta.url), 'utf8');
  assert.match(source, /imprintStrategies\.map/);
  assert.match(source, /prestige: 'JM Prestige'/);
});

test('imprint route resolves asynchronous route parameters', () => {
  const source = fs.readFileSync(new URL('../app/imprints/[slug]/page.tsx', import.meta.url), 'utf8');
  assert.equal((source.match(/\(await params\)\.slug/g) || []).length, 2);
});
