# 할루시네이터-리얼 (Hallucinator-Real)

> 2022년 11월, 초창기 ChatGPT를 그대로 재현합니다.

초기 ChatGPT(GPT-3.5)의 자신만만하고 장황한 답변 스타일을 Grok API로 재현하는 레트로 AI 챗봇입니다. 편향된 학습 데이터로 인해 **자연스럽게 발생하는 미묘한 오류**를 체험할 수 있습니다.

## 컨셉

초창기 GPT-3.5는 영어권 인터넷 데이터를 압도적으로 많이 학습했습니다. 덕분에 서양사·과학·코딩·논리 등에는 꽤 정확하게 답하지만, 한국사나 동아시아 역사처럼 학습 데이터가 상대적으로 부족한 분야에서는 확신에 차면서도 미묘하게 틀린 정보를 내놓습니다. 날짜가 살짝 어긋나거나, 발명품이 엉뚱한 왕에게 귀속되거나, 두 사건이 하나로 합쳐지거나 — 전문가가 아니면 바로 알아채기 어려운 수준의 오류입니다.

> 일부러 오류를 만드는 AI가 아닌, 편향된 학습 데이터로 인해 자연스럽게 실수하는 AI입니다.

## 주요 기능

- **1픽셀 재현 UI** - 2022년 11월 ChatGPT 다크 모드 그대로
- **영어권 편향 지식** - 서양사·과학·코딩은 정확, 한국사·동아시아사에서 간헐적 오류
- **Special Starter Commands**
  - `할루시네이션이란?` - AI 할루시네이션 한 문장 정의
  - `아무 말이나 해 봐` - 그럴듯하지만 미묘하게 틀린 역사 사실
- **스트리밍 응답** - 실시간 타이핑 효과

## 배포 방법

### 1. 레포지토리 구조

```
hallucinator/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
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
`js/app.js`의 `__GROK_API_KEY__` 플레이스홀더가 실제 키로 치환되어 배포됩니다.

## 로컬 테스트

```bash
# js/app.js의 __GROK_API_KEY__ 를 실제 키로 임시 교체 후
# 아무 로컬 서버로 실행
npx serve .
```

## 기술 스택

- Vanilla HTML / CSS / JS
- Grok API (xAI, OpenAI 호환 스트리밍)
- GitHub Pages + Actions 자동 배포

## 참고

⚠️ Hallucinator-Real은 **초기 AI의 할루시네이션 현상이 구현된** 챗봇입니다. 편향된 학습 데이터로 인해 간헐적 오류가 포함됩니다.
