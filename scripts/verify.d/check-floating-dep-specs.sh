#!/usr/bin/env bash
# package.json 에 떠 있는(floating) 버전 스펙이 없는지 검사 — 네트워크를 쓰지 않는다.
#
# 왜 필요한가 (posselect-shell #124, 2026-08-28 실측):
#   devDependencies 가 vite 만 "^5.4.0" 으로 묶고 vitest 계열은 "latest" 로 떠 있었다.
#   락을 다시 만들 때마다 vitest 만 최신(4.x, vite ^6||^7||^8 요구)으로 올라가고 vite 는 5 에
#   묶여, lock 안에 esbuild 0.21.5 만 남은 채 0.28.2 를 요구하는 트리가 생겼다.
#   그 결과 `npm ci` 가 상시 실패해 PR #118~#123 여섯 건 연속으로 verify 게이트가 죽어 있었고,
#   프로덕션 이미지 빌드는 `npm ci || npm install` 폴백을 타 통과했다 — 게이트는 죽고 배포는
#   계속 나가는, 재현성 없는 상태였다.
#
#   "latest" 를 지우지 않으면 같은 어긋남이 반복된다. 그래서 스펙 자체를 금지한다.
set -uo pipefail

[ -f package.json ] || exit 0
command -v node >/dev/null 2>&1 || exit 0

node - <<'NODE'
const pkg = require('./package.json');
// 해석 시점마다 결과가 달라지는 스펙. 캐럿/틸드/정확버전/깃 의존성은 허용한다.
const FLOATING = new Set(['latest', '*', '', 'next', 'x', 'X']);
const bad = [];
for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
  for (const [name, spec] of Object.entries(pkg[field] || {})) {
    if (FLOATING.has(String(spec).trim())) bad.push(`${field}.${name} = "${spec}"`);
  }
}
if (bad.length) {
  console.error('❌ package.json 에 떠 있는 버전 스펙이 있습니다:');
  for (const b of bad) console.error(`   ${b}`);
  console.error('');
  console.error('   해석 시점마다 다른 버전이 잡혀 package-lock.json 이 내부적으로 어긋나고,');
  console.error('   그 락으로는 `npm ci` 가 실패해 CI 게이트가 통째로 죽습니다(posselect-shell #124).');
  console.error('   캐럿 범위(예: "^4.1.10")로 고정한 뒤 락을 다시 만드세요.');
  process.exit(1);
}
NODE
