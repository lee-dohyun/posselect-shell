// 최근 본 상품: 서버 저장 없이 클라이언트 localStorage에만 기록한다(posselect-shell#80 1단계
// 범위 — 로그인 사용자용 서버 저장은 선택 사항으로 별도 이슈로 남겨둠).
//
// 알려진 한계: localStorage는 origin 단위로 격리되므로, product.posselect.com에서 기록한
// 항목은 customer.posselect.com/home.posselect.com 등 다른 origin에 마운트된 Header에서는
// 보이지 않는다. 상품 상세 페이지가 실제로 서비스되는 origin(product.posselect.com)에서는
// 정상 동작하므로 1단계로는 충분하다고 판단.
export interface RecentlyViewedItem {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  href: string;
  viewedAt: number;
}

export const RECENTLY_VIEWED_STORAGE_KEY = 'posselect:recently-viewed';
// localStorage의 'storage' 이벤트는 변경을 발생시킨 탭 자신에게는 발화하지 않는다(다른 탭에만
// 전파되는 브라우저 표준 동작) — 상품 상세 페이지가 자기 페이지 상단의 Header에 방금 본 상품을
// 즉시 반영하려면 같은 탭 안에서도 감지 가능한 커스텀 이벤트가 따로 필요하다.
export const RECENTLY_VIEWED_CHANGE_EVENT = 'posselect:recently-viewed-change';
const MAX_ITEMS = 20;

function readAll(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // 시크릿 모드 저장 공간 초과, 손상된 JSON 등 — 최근 본 상품은 부가 기능이므로 조용히 빈
    // 목록으로 취급하고 페이지 나머지 동작에는 영향을 주지 않는다.
    return [];
  }
}

function writeAll(items: RecentlyViewedItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(items));
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_CHANGE_EVENT));
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  return readAll();
}

export function addRecentlyViewed(item: Omit<RecentlyViewedItem, 'viewedAt'>): void {
  const deduped = readAll().filter((existing) => existing.id !== item.id);
  const next = [{ ...item, viewedAt: Date.now() }, ...deduped].slice(0, MAX_ITEMS);
  writeAll(next);
}

export function clearRecentlyViewed(): void {
  writeAll([]);
}
