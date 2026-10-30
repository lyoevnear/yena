# 프로젝트에 포함된 글꼴

기본 UI·제목·본문·선택지에는 Pretendard Variable, 편지 본문·편지 제목·서명·봉투 수신인에는 Gaegu(개구체)를 사용합니다. 두 글꼴 모두 실제 파일을 프로젝트에 포함합니다.

- Pretendard: [제작자 저장소](https://github.com/orioncactus/pretendard), [원본 WOFF2](https://github.com/orioncactus/pretendard/blob/main/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2). 라이선스 전문: `Pretendard-LICENSE.txt`.
- Gaegu(개구체): [Google Fonts 원본](https://github.com/google/fonts/tree/main/ofl/gaegu), JIKJI SOFT / The Gaegu Project Authors. 라이선스 전문: `Gaegu-OFL.txt`.

공식 저장소의 원본 파일을 2026-10-30에 내려받았습니다. 글꼴 파일을 수정하지 않았습니다.

모바일 로딩을 위해 실제 웹페이지에서는 `Gaegu-letter.ttf`를 사용합니다. [Google Fonts의 text 파라미터](https://developers.google.com/fonts/docs/getting_started#optimizing_your_font_requests)로 편지·제목·서명·봉투에 쓰이는 문자만 포함한 파일을 받아 프로젝트에 저장했습니다. 현재 편지 기준 101,580바이트를 전송합니다. 런타임에는 외부 폰트 요청을 하지 않습니다.

손글씨 문구를 바꾼 경우 `node scripts/refresh-letter-font.mjs`로 문자 목록과 파일을 갱신합니다. 이 유지보수 명령만 네트워크를 사용하며, 일반 빌드는 오프라인으로 가능합니다. `node scripts/check.mjs`는 현재 편지의 모든 문자가 경량 파일 목록에 있는지 확인합니다.
