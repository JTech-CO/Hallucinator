# 할루시네이터 (Hallucinator)

> 2022년 11월, 그 황금기의 ChatGPT를 다시 만나보세요.

초기 ChatGPT(GPT-3.5)의 자신만만하고 장황한 답변 스타일을 Grok API로 재현하는 레트로 AI 챗봇입니다. [실행하기](<https://jtech-co.github.io/Hallucinator/>)

## 주요 기능

- **1픽셀 재현 UI** - 2022년 11월 ChatGPT 다크 모드 그대로
- **Special Starter Commands**
  - `할루시네이션이란?` - AI 할루시네이션 한 문장 정의
  - `아무 말이나 해 봐` - 랜덤 황당 사실 생성
- **한국 역사 판타지 모드** - 세종대왕이 맥북을 던지는 그 감성
- **스트리밍 응답** - 실시간 타이핑 효과

## 배포 방법

### 1. 레포지토리 생성 & 파일 업로드

```
hallucinator/
├── index.html
└── .github/
    └── workflows/
        └── deploy.yml
```

### 2. GitHub Secret 등록

1. Repository → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭
3. Name: `GROK_API_KEY`
4. Value: xAI API 키 입력 (https://console.x.ai 에서 발급)

### 3. GitHub Pages 활성화

1. Repository → **Settings** → **Pages**
2. Source: **GitHub Actions** 선택

### 4. 배포

`main` 브랜치에 push하면 자동으로 빌드 & 배포됩니다.
`__GROK_API_KEY__` 플레이스홀더가 실제 키로 치환되어 배포됩니다.

## 로컬 테스트

```bash
# index.html의 __GROK_API_KEY__ 를 실제 키로 임시 교체 후
# 아무 로컬 서버로 실행
npx serve .
```

## 기술 스택

- Vanilla HTML/CSS/JS
- Grok API (xAI, OpenAI 호환 스트리밍)
- GitHub Pages + Actions 자동 배포

## 참고

⚠️ 이 서비스는 **의도적으로 할루시네이션을 생성**합니다. 정확한 정보 제공을 보장하지 않습니다.
