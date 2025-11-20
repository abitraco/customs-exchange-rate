# 대한민국 관세환율 대시보드 (Korea Customs FX Rate Dashboard)

이 프로젝트는 대한민구 관세청 공개데이터 API를 이용해 수출/수입 환율을 시각화하는 대시보드입니다. 이제 모든 데이터는 정적 JSON으로 제공되어 런타임 API 호출 없이도 항상 최신 환율을 표시합니다.

**Live Demo:** [https://customsrate.abitra.co/](https://customsrate.abitra.co/)

## 주요 변경 사항
- 환율 데이터는 로컬 스크립트(`npm run generate:data`)가 생성한 `public/exchange-rates.json` 한 파일로 관리됩니다.
- 프론트엔드는 관세청 API를 직접 호출하지 않고, 위 JSON 스냅샷만 읽어 화면을 그립니다.
- GitHub Actions가 매주 금요일 19:00 KST에 데이터를 갱신하여 커밋/배포합니다.
- Vercel 자동 배포와 결합되어 항상 최신 환율이 제공됩니다.

## 데이터 파이프라인
1) `scripts/generateRates.js`
   - 관세청 `getRetrieveTrifFxrtInfo` API에서 최근 12주치 수출/수입 환율을 수집해 정규화합니다.
   - API 키 미사용/오류 시에도 서비스 가능한 목업 데이터로 자동 대체합니다.
   - 결과는 `public/exchange-rates.json`에 저장됩니다.

2) GitHub Actions (`.github/workflows/update-rates.yml`)
   - 트리거: cron `0 10 * * 5` → 매주 금요일 19:00 KST(UTC+9) + `workflow_dispatch` 수동 실행 지원.
   - 단계: `npm ci` → `npm run generate:data` → 파일 변경 시 자동 커밋/푸시 → Vercel이 새 스냅샷으로 배포.
   - 레포지토리 시크릿: `CUSTOMS_API_KEY` (관세청 서비스 키, 디코딩 값)를 설정해야 실제 데이터를 가져옵니다.

## 로컬 개발 방법
- 기본 실행
  ```bash
  npm install
  npm run dev
  # http://localhost:5173 접속
  ```
  이미 저장된 `public/exchange-rates.json` 덕분에 별도 설정 없이 바로 화면을 확인할 수 있습니다.

- 실제 데이터로 갱신 (선택)
  ```bash
  $env:CUSTOMS_API_KEY="<관세청 서비스키 디코딩 값>" # PowerShell 예시
  npm run generate:data
  ```
  키가 없으면 자동으로 목업 데이터가 생성되며, UI는 동일하게 동작합니다.

## 배포 (Vercel)
- 런타임 환경 변수 없이 정적 자산만 배포하면 됩니다.
- `public/exchange-rates.json`이 변경될 때마다 Vercel이 새 버전을 배포해 최신 스냅샷이 반영됩니다.

## 데이터 스키마
`public/exchange-rates.json`
```json
{
  "generatedAt": "ISO timestamp",
  "source": "Korea Customs Service (static snapshot)",
  "weeks": [
    {
      "startDate": "YYYY-MM-DD",
      "import": [ { "countryCode": "US", "currencyCode": "USD", "rate": 1350, ... } ],
      "export": [ { ... } ]
    }
  ]
}
```

## 참고
- 기존 `.env`는 런타임에 필요하지 않습니다. (로컬 데이터 생성 시에만 선택적으로 사용)
- API Key는 반드시 GitHub Secrets 등 안전한 저장소에 보관하세요.
