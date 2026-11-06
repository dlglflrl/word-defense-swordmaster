# S'word Master: 워드 디펜스

순수 JavaScript와 Vite로 만든 영어 단어 디펜스 게임입니다.

## 시작하기

Node.js 20.19 이상 또는 22.12 이상을 설치한 뒤 프로젝트 폴더에서 다음 명령어를 실행하세요. (Node.js 21은 지원하지 않습니다.)

```bash
npm install
npm run dev
```

터미널에 표시되는 주소를 브라우저에서 열면 됩니다. 배포용 파일을 만들고 미리 확인하려면 다음 명령어를 사용하세요.

```bash
npm run build
npm run preview
```

빌드 결과는 `dist/` 폴더에 생성됩니다.

## 프로젝트 구조

- `index.html`: 게임 화면 구조
- `src/style.css`: 화면 스타일
- `src/main.js`: 게임 로직
- `src/words.js`: 기본 단어 데이터
- `package.json`: 개발 서버와 빌드 설정

학습 기록과 게임 진행 상황은 브라우저의 localStorage에 저장됩니다. 저장소는 주소(출처)별로 구분되므로 기존에 HTML 파일을 직접 열어 플레이했다면 개발 서버에서 이전 기록이 보이지 않을 수 있습니다.
