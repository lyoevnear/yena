(() => {
  'use strict';
  const story = window.YENA_STORY;
  const illustrations = window.YENA_ILLUSTRATIONS;
  const artwork = id => illustrations.scenes.find(scene => scene.id === id);
  const assetPath = src => src.startsWith('/') ? 'public' + src : src;
  const STORAGE_KEY = 'yena-little-story-v1';
  const app = document.getElementById('app');
  const mobileControls = document.getElementById('mobile-controls');
  const compactLayout = window.matchMedia('(max-width: 960px)');
  const other = 'other';
  const defaultState = () => ({ screen: 'home', index: 0, answers: {}, opened: false });
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const narrative = text => escape(text).replace(/(\.+)[ \t]+(?=\S)/g, (match, dots) => dots === '.' ? '.<br>' : match);
  let toastTimer;
  let inputViewportHeight = 0;
  let keyboardWasVisible = false;
  let upcomingImage;
  let state = readState();
  const questions = [...story.scenes, story.finalQuestion];

  function validAnswer(answer, question) {
    return answer && typeof answer === 'object' && typeof answer.text === 'string' && answer.text.length <= 300 &&
      (answer.choice === other || (Number.isInteger(answer.choice) && answer.choice >= 0 && answer.choice < question.options.length));
  }

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== 'object') return defaultState();
      const clean = defaultState();
      clean.index = Number.isInteger(saved.index) ? Math.min(14, Math.max(0, saved.index)) : 0;
      clean.screen = ['home', 'story', 'wish', 'letter'].includes(saved.screen) ? saved.screen : 'home';
      for (const question of [...story.scenes, story.finalQuestion]) {
        if (validAnswer(saved.answers?.[question.id], question)) clean.answers[question.id] = saved.answers[question.id];
      }
      const allAnswered = [...story.scenes, story.finalQuestion].every(q => isAnswered(clean.answers[q.id]));
      clean.opened = saved.opened === true && allAnswered;
      if (clean.screen === 'letter' && !allAnswered) clean.screen = 'story';
      if (clean.screen === 'wish' && !story.scenes.every(q => isAnswered(clean.answers[q.id]))) clean.screen = 'story';
      return clean;
    } catch {
      return defaultState();
    }
  }

  function isAnswered(answer) { return Boolean(answer && (answer.choice !== other || answer.text.trim())); }
  function completed() { return questions.filter(q => isAnswered(state.answers[q.id])).length; }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { /* Continue in memory when browser storage is unavailable. */ }
  }
  function toast(text) {
    const element = document.getElementById('toast');
    element.textContent = text;
    element.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('visible'), 4000);
  }
  function go(screen, index = state.index) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    state.screen = screen;
    state.index = index;
    persist();
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => app.querySelector('h1')?.focus({ preventScroll: true }));
  }

  function home() {
    const started = Object.keys(state.answers).length > 0;
    return `<section class="home-screen page-enter">
      <div class="home-copy">
        <h1 tabindex="-1">예나<br><span class="rose-text">마음 탐험기</span></h1>
        <p class="home-subtitle">어젯밤부터 오늘까지, 우리 이야기</p>
        <p class="home-description">어제 예나는 어떤 마음이었어?<br>나한테 들려줄래?</p>
        <div class="home-actions"><button class="primary-button start-button" data-action="start">${started ? '우리 이야기 이어가기' : '우리 이야기 시작하기'}<span aria-hidden="true">↗</span></button><span class="playtime">15개의 순간 · 약 3~5분</span></div>
        ${started ? `<button class="text-button" data-action="reset">처음부터 다시 걸어볼래</button>` : ''}
      </div>
      <div class="home-art" aria-label="예나와 민서의 캐릭터 시안">
        <div class="art-paper"><svg class="heart-background" viewBox="0 0 500 440" aria-hidden="true" focusable="false"><path d="M250 420 C220 395 25 245 25 125 C25 20 170 0 250 100 C330 0 475 20 475 125 C475 245 280 395 250 420 Z"/></svg><div class="couple"><img class="couple-cutout" src="${escape(assetPath(illustrations.character.display))}" alt="꽃무늬 원피스 잠옷을 입은 예나와 코끼리 무늬 수면잠옷을 입은 민서" width="1024" height="1536" decoding="async" draggable="false"></div><div class="art-caption"><span>예나</span><span aria-hidden="true">♥</span><span>민서</span></div></div>
      </div>
    </section>`;
  }

  function progress(label, count) {
    return `<div class="journey-navigation"><div class="journey-header"><button class="back-button" data-action="back"><span aria-hidden="true">←</span> 이전으로</button><span class="journey-label">${escape(label)}</span><span class="journey-count">${String(count).padStart(2, '0')} <span>/ 16</span></span></div><div class="progress-track" role="progressbar" aria-label="이야기 진행" aria-valuemin="0" aria-valuemax="16" aria-valuenow="${count}"><div style="width:${count / 16 * 100}%"></div></div></div>`;
  }

  function sceneArt(scene) {
    const image = artwork(scene.id);
    const firstImage = artwork(story.scenes[0].id);
    const ratio = firstImage?.width && firstImage?.height ? `${firstImage.width} / ${firstImage.height}` : '3 / 2';
    return `<div class="scene-art" style="aspect-ratio:${ratio}" data-scene-art>
      ${image?.available ? `<img class="scene-image" data-scene-image src="${escape(assetPath(image.src))}" alt="${escape(image.alt)}" decoding="async" hidden>` : ''}
      <span class="scene-time">${escape(scene.time)}</span>
    </div>`;
  }

  function choices(question) {
    const answer = state.answers[question.id];
    const chosen = answer?.choice;
    return `<section class="question-panel" aria-labelledby="question-title">
      <h2 id="question-title">${escape(question.question)}</h2>
      <fieldset><legend class="sr-only">${escape(question.question)}</legend>
        ${[...question.options, '다른 마음이었어 · 직접 이야기할래'].map((option, index) => {
          const value = index === question.options.length ? other : index;
          const selected = chosen === value;
          return `<label class="choice ${selected ? 'selected' : ''}" for="choice-${index}"><input type="radio" id="choice-${index}" name="feeling" value="${value}" ${selected ? 'checked' : ''}><span class="choice-letter" aria-hidden="true">${String.fromCharCode(65 + index)}</span><span>${escape(option)}</span><span class="choice-mark" aria-hidden="true">${selected ? '♡' : ''}</span></label>`;
        }).join('')}
      </fieldset>
      <div class="custom-answer" ${chosen === other ? '' : 'hidden'}><label for="custom-answer">예나의 말로 편하게 들려줘</label><textarea id="custom-answer" maxlength="300" rows="3" enterkeyhint="done" autocomplete="off" placeholder="사실 내 마음은…">${escape(answer?.text || '')}</textarea><div class="input-meta"><button class="text-button input-done" data-action="finish-input" type="button">입력 마치기</button><span id="character-count">${answer?.text.length || 0} / 300</span></div></div>
      <div class="question-footer">${nextButton(question)}</div>
    </section>`;
  }
  function nextButton(question) {
    return `<button class="primary-button next-button" data-action="next" ${isAnswered(state.answers[question.id]) ? '' : 'disabled'}><span class="button-label">${state.screen === 'wish' ? '민서의 편지 만나기' : state.index === 14 ? '지금의 마음으로' : '다음 이야기'}</span> <span class="button-arrow" aria-hidden="true">→</span></button>`;
  }
  function scene() {
    const current = story.scenes[state.index];
    return `<section class="game-screen page-enter">${progress(current.chapter, state.index + 1)}<div class="story-layout"><article class="story-panel">${sceneArt(current)}<div class="story-copy"><span class="eyebrow">${state.index + 1}번째 이야기</span><h1 tabindex="-1">${escape(current.title)}</h1>${current.paragraphs.map(p => `<p>${narrative(p)}</p>`).join('')}</div></article>${choices(current)}</div></section>`;
  }
  function wish() {
    return `<section class="game-screen page-enter">${progress('지금의 마음', 16)}<div class="story-layout wish-layout"><article class="story-panel wish-intro"><h1 tabindex="-1">그럼 지금은<br>어떻게 해줄까?</h1><p>이야기해줘서 고마워.</p><p>지금 예나가 원하는 것도 알려줘.<br>내가 어떻게 해주면 좋겠어?</p></article>${choices(story.finalQuestion)}</div></section>`;
  }
  function answerText(question) {
    const answer = state.answers[question.id];
    if (!isAnswered(answer)) return '아직 들려주지 않은 마음';
    return answer.choice === other ? answer.text.trim() : question.options[answer.choice];
  }
  function letter() {
    return `<section class="letter-screen page-enter">${progress('민서가 예나에게', 16)}<div class="letter-intro"><h1 tabindex="-1">예나에게 쓴 편지</h1><p>마지막으로 하고 싶은 말이 있어.</p></div>
      <div class="letter-stage ${state.opened ? 'is-open' : ''}">
        <button class="envelope" data-action="open-letter" aria-label="민서의 편지 열기" ${state.opened ? 'hidden' : ''}><span class="envelope-back"></span><span class="envelope-paper">To. 예나</span><span class="envelope-front"></span><span class="envelope-flap"></span><span class="envelope-seal">♡</span></button>
        <p class="envelope-hint" ${state.opened ? 'hidden' : ''}>마음을 열어볼래?</p>
        <article class="letter-paper" ${state.opened ? '' : 'hidden'} aria-labelledby="letter-title"><h2 id="letter-title" tabindex="-1">💌 민서가 예나에게 보내는 편지</h2><p class="letter-body">${escape(story.letter)}</p><div class="letter-sign"><strong>민서가 <span aria-hidden="true">♥</span></strong></div>${artwork('scene-16')?.available ? `<img class="letter-scene" data-scene-image src="${escape(assetPath(artwork('scene-16').src))}" alt="${escape(artwork('scene-16').alt)}" hidden>` : ''}</article>
      </div>
      ${state.opened ? `<div class="after-letter page-enter"><details class="answer-summary"><summary>내 답변 다시 보기 <span aria-hidden="true">＋</span></summary><ol>${questions.map(q => `<li><strong>${escape(q.question)}</strong><p>${escape(answerText(q))}</p></li>`).join('')}</ol></details><div class="ending-links"><button class="text-button" data-action="revisit">이야기 다시 돌아보기</button><button class="text-button" data-action="reset">이 기기의 기록 지우기</button></div></div>` : ''}
    </section>`;
  }

  function render() {
    app.innerHTML = state.screen === 'story' ? scene() : state.screen === 'wish' ? wish() : state.screen === 'letter' ? letter() : home();
    app.querySelectorAll('[data-scene-image]').forEach(img => {
      const reveal = () => { img.hidden = false; img.closest('[data-scene-art]')?.classList.add('image-loaded'); };
      img.addEventListener('load', reveal, { once: true });
      img.addEventListener('error', () => { img.hidden = true; }, { once: true });
      if (img.complete && img.naturalWidth > 0) reveal();
    });
    if (state.screen === 'story') {
      const next = artwork(story.scenes[state.index + 1]?.id);
      if (next?.available) {
        upcomingImage = new Image();
        upcomingImage.decoding = 'async';
        upcomingImage.src = assetPath(next.src);
      }
    }
    document.title = state.screen === 'story' ? `${state.index + 1}. ${story.scenes[state.index].title} · 예나 마음 탐험기` : '예나 마음 탐험기';
    const hasControls = state.screen === 'story' || state.screen === 'wish';
    mobileControls.hidden = !hasControls;
    mobileControls.innerHTML = hasControls ? `<div class="mobile-controls-inner"><button class="secondary-button mobile-back" data-action="back" aria-label="이전 이야기"><span aria-hidden="true">←</span></button>${nextButton(currentQuestion())}</div>` : '';
    document.body.classList.toggle('has-mobile-controls', hasControls);
    syncTypingState();
    updateControlsHeight();
    resizeAnswer();
  }

  function updateControlsHeight() {
    if (!mobileControls.hidden && mobileControls.offsetHeight > 0) {
      document.documentElement.style.setProperty('--mobile-controls-height', mobileControls.offsetHeight + 'px');
    }
  }
  function resizeAnswer() {
    const field = document.getElementById('custom-answer');
    if (!field || field.closest('[hidden]')) return;
    field.style.height = 'auto';
    const limit = Math.max(150, Math.min(300, (window.visualViewport?.height || innerHeight) * .45));
    field.style.height = Math.min(Math.max(field.scrollHeight, 140), limit) + 'px';
  }
  function syncTypingState() {
    const focused = compactLayout.matches && document.activeElement?.id === 'custom-answer';
    const height = window.visualViewport?.height || innerHeight;
    if (!focused) {
      inputViewportHeight = 0;
      keyboardWasVisible = false;
      document.body.classList.remove('is-typing');
      return;
    }
    if (!inputViewportHeight) inputViewportHeight = height;
    const smaller = inputViewportHeight - height > 120;
    if (smaller) keyboardWasVisible = true;
    // Closing a phone keyboard can retain focus; restore navigation when its viewport returns.
    document.body.classList.toggle('is-typing', !keyboardWasVisible || smaller);
  }
  function updateAnswerUI(question) {
    const answer = state.answers[question.id];
    app.querySelectorAll('.choice').forEach(label => {
      const input = label.querySelector('input');
      const selected = input.value === String(answer.choice);
      input.checked = selected;
      label.classList.toggle('selected', selected);
      label.querySelector('.choice-mark').textContent = selected ? '♡' : '';
    });
    document.querySelector('.custom-answer').hidden = answer.choice !== other;
    document.querySelectorAll('[data-action="next"]').forEach(button => { button.disabled = !isAnswered(answer); });
    document.getElementById('character-count').textContent = `${answer.text.length} / 300`;
    resizeAnswer();
  }
  function currentQuestion() { return state.screen === 'wish' ? story.finalQuestion : story.scenes[state.index]; }
  function start() {
    if (completed() === questions.length) return go('letter');
    const firstMissing = story.scenes.findIndex(q => !isAnswered(state.answers[q.id]));
    if (firstMissing === -1) go('wish');
    else go('story', firstMissing);
  }
  function next() {
    if (!isAnswered(state.answers[currentQuestion().id])) return;
    if (state.screen === 'wish') {
      const missing = story.scenes.findIndex(q => !isAnswered(state.answers[q.id]));
      return missing >= 0 ? go('story', missing) : go('letter');
    }
    if (state.index < 14) go('story', state.index + 1);
    else {
      const missing = story.scenes.findIndex(q => !isAnswered(state.answers[q.id]));
      if (missing >= 0) go('story', missing);
      else go('wish');
    }
  }
  function back() {
    if (state.screen === 'letter') go('wish');
    else if (state.screen === 'wish') go('story', 14);
    else if (state.index === 0) go('home');
    else go('story', state.index - 1);
  }
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'start') start();
    if (action === 'next' && !event.target.closest('button').disabled) next();
    if (action === 'back') back();
    if (action === 'finish-input') {
      document.getElementById('custom-answer')?.blur();
      syncTypingState();
    }
    if (action === 'revisit') go('story', 0);
    if (action === 'reset') document.getElementById('reset-dialog').showModal();
    if (action === 'open-letter') {
      state.opened = true; persist(); render();
      requestAnimationFrame(() => document.getElementById('letter-title')?.focus({ preventScroll: true }));
    }
  });
  app.addEventListener('change', event => {
    if (!event.target.matches('input[name="feeling"]')) return;
    const question = currentQuestion();
    const oldText = state.answers[question.id]?.text || '';
    const selected = event.target.value === other ? other : Number(event.target.value);
    state.answers[question.id] = { choice: selected, text: oldText };
    persist();
    updateAnswerUI(question);
    if (selected === other) {
      const field = document.getElementById('custom-answer');
      field.focus({ preventScroll: true });
      requestAnimationFrame(() => field.scrollIntoView({ block: 'center', behavior: 'instant' }));
    }
  });
  app.addEventListener('input', event => {
    if (event.target.id !== 'custom-answer') return;
    const question = currentQuestion();
    state.answers[question.id].text = event.target.value.slice(0, 300);
    persist();
    updateAnswerUI(question);
  });
  document.getElementById('home-link').addEventListener('click', event => { event.preventDefault(); go('home'); });
  document.getElementById('help-button').addEventListener('click', () => document.getElementById('help-dialog').showModal());
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.getElementById('confirm-reset').addEventListener('click', () => {
    state = defaultState();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Memory state is already reset. */ }
    document.getElementById('reset-dialog').close();
    render(); window.scrollTo({ top: 0, behavior: 'instant' });
    toast('이 기기의 답변과 진행 기록을 지웠어.');
  });
  document.addEventListener('focusin', syncTypingState);
  document.addEventListener('focusout', () => requestAnimationFrame(syncTypingState));
  const viewportChanged = () => {
    syncTypingState();
    resizeAnswer();
    updateControlsHeight();
    if (document.body.classList.contains('is-typing') && (window.visualViewport?.scale || 1) === 1) {
      requestAnimationFrame(() => {
        const field = document.getElementById('custom-answer');
        if (!field || document.activeElement !== field) return;
        const rect = field.getBoundingClientRect();
        const top = (window.visualViewport?.offsetTop || 0) + 88;
        const bottom = (window.visualViewport?.offsetTop || 0) + (window.visualViewport?.height || innerHeight) - 16;
        if (rect.top < top || rect.bottom > bottom) field.scrollIntoView({ block: 'center', behavior: 'instant' });
      });
    }
  };
  window.addEventListener('resize', viewportChanged, { passive: true });
  window.visualViewport?.addEventListener('resize', viewportChanged, { passive: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(updateControlsHeight).observe(mobileControls);
  render();
})();
