import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Repository } from '../apps/server/src/rpg/Repository.ts';
test('independent character save survives server restart without accepting an unknown key', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aetheria-save-')),
    file = join(dir, 'profiles.json');
  try {
    const first = new Repository(file),
      p = first.open(undefined, 'Guardian');
    p.gold = 111;
    p.questState = 3;
    p.items.push({ ...p.items[0], id: 'loot-sword' });
    first.save();
    const restarted = new Repository(file),
      restored = restarted.open(p.token, 'Guardian');
    assert.equal(restored.id, p.id);
    assert.equal(restored.gold, 111);
    assert.equal(restored.questState, 3);
    assert.ok(restored.items.some((i) => i.id === 'loot-sword'));
    const stranger = restarted.open('00000000-0000-0000-0000-000000000000', 'Stranger');
    assert.notEqual(stranger.id, p.id);
    assert.equal(stranger.gold, 0);
    writeFileSync(file, '{ corrupt');
    assert.throws(() => new Repository(file), 'A corrupt save is never silently overwritten');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
