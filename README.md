# 할루시네이터-리얼 (Hallucinator-Real)

> **편향된 학습 데이터로 인해 자연스럽게 실수하는 초창기 ChatGPT 재현 챗봇**

[실행하기](https://hallucinatorreal.pages.dev/)

## 1. 소개 (Introduction)

초기 ChatGPT(GPT-3.5)의 자신만만하고 장황한 답변 스타일을 Grok API로 재현하는 레트로 AI 챗봇입니다.
초창기 GPT-3.5는 영어권 인터넷 데이터를 압도적으로 많이 학습했기 때문에, 서양사·과학·코딩에는 정확하지만 한국사·동아시아사에서는 미묘하게 틀린 정보를 자신 있게 내놓습니다.

> 일부러 오류를 만드는 AI가 아닌, 편향된 학습 데이터로 인해 자연스럽게 실수하는 AI입니다.

**주요 기능**
- **1픽셀 재현 UI**: 2022년 11월 ChatGPT 다크 모드 그대로
- **영어권 편향 지식**: 서양사·과학·코딩은 정확, 한국사·동아시아사에서 간헐적 오류
- **Special Starter Commands**: `할루시네이션이란?` (한 문장 정의), `아무 말이나 해 봐` (그럴듯하지만 미묘하게 틀린 역사 사실)
- **스트리밍 응답**: 실시간 타이핑 효과

## 2. 기술 스택 (Tech Stack)

- **Frontend**: Vanilla HTML / CSS / JS
- **AI API**: Grok API (xAI, OpenAI 호환 스트리밍)
- **Deployment**: Cloudflare Workers

## 3. 설치 및 실행 (Quick Start)

1. **GitHub Secret 등록**
   - Repository → **Settings** → **Secrets and variables** → **Actions**
   - **New repository secret**으로 다음 3가지를 등록합니다:
     - `GROK_API_KEY`: xAI API 키 (https://console.x.ai 에서 발급)
     - `CLOUDFLARE_API_TOKEN`: Cloudflare 토큰 (Edit Cloudflare Workers 권한)
     - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 계정 ID

2. **Cloudflare 사전 설정**
   - 기존 Cloudflare Pages 자동 연동(GitHub 직접 연결)이 설정되어 있다면 해제합니다.

3. **배포**
   - GitHub `main` 브랜치에 코드를 push하면 GitHub Actions 워크플로우(`deploy.yml`)가 자동으로 실행됩니다.
   - `__GROK_API_KEY__` 치환 후 Wrangler를 통해 Cloudflare Pages에 업로드됩니다.

4. **로컬 테스트**
   ```bash
   # js/app.js의 __GROK_API_KEY__ 를 실제 키로 임시 교체 후
   npx serve .
   ```

## 4. 폴더 구조 (Structure)

```text
hallucinator-real/
├── index.html         # 메인 페이지

├── css/
│   └── style.css      # 2022 ChatGPT 다크 모드 UI
├── js/
│   └── app.js         # AI 챗봇 로직 및 시스템 프롬프트
├── image/             # 이미지 리소스
└── .github/
    └── workflows/
        └── deploy.yml # Cloudflare Pages 자동 배포 (GitHub Actions 주도)
```

## 5. 정보 (Info)

- ⚠️ Hallucinator-Real은 **초기 AI의 할루시네이션 현상이 구현된** 챗봇입니다. 편향된 학습 데이터로 인해 간헐적 오류가 포함됩니다.
