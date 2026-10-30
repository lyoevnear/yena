import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const sandbox = { window: {} };
runInNewContext(await readFile('data/story.js', 'utf8'), sandbox);
const story = sandbox.window.YENA_STORY;
const images = JSON.parse(await readFile('data/story-illustrations.json', 'utf8'));
assert.equal(story.scenes.length, 15, 'All 15 real events must be included');
assert.equal(images.scenes.length, 16, '15 events and one letter illustration');
for (let i = 0; i < 15; i++) {
  assert.equal(story.scenes[i].id, `scene-${String(i + 1).padStart(2, '0')}`);
  assert.equal(story.scenes[i].id, images.scenes[i].id);
  assert.equal(images.scenes[i].src, `assets/${i + 1}.png`);
  await access(images.scenes[i].src);
  assert.equal(story.scenes[i].options.length, story.scenes[i].responses.length);
  assert.ok(story.scenes[i].paragraphs.length > 0);
}
assert.equal(story.finalQuestion.options.length, story.finalQuestion.responses.length);
assert.equal(images.scenes[15].kind, 'letter');
assert.equal(story.letter, '예나야 어제 늦게까지 야근하고 힘들게 들어왔는데 내가 너무 졸려서 제대로 못 챙겨준 것 같네 ㅠㅠ 필러 맞은 것도 신경 못 쓰고 얼굴 만졌고.. 서운했어? 아침부터 뭔가 분위기가 다르고 기분이 안 좋아 보여서 마음에 걸렸어 🥺 내가 이거 한창 만들고 있는 사이에 점심 시간엔 그래도 뭐 먹었는지 사진 보내면서 카톡하는 걸 보니 시간이 지나 괜찮아진 거 같긴 한데 그래도 마무리는 해서 보내ㅎㅎ 예나 화이팅!');
await access('public' + images.character.reference);
await access('public' + images.character.display);
await access('public/fonts/Gaegu-letter.ttf');
const handwritingCoverage = await readFile('public/fonts/letter-characters.txt', 'utf8');
for (const char of story.letter + '💌 민서가 예나에게 보내는 편지 To. 예나 ♡ ♥') {
  assert.ok(handwritingCoverage.includes(char), `Refresh handwriting subset with node scripts/refresh-letter-font.mjs (missing ${char})`);
}
console.log('15 ordered events, 16 illustration mappings, all choice responses, character reference, and verbatim letter verified.');
