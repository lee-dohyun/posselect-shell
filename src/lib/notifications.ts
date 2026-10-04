// 회원 알림함(auth.api /api/auth/notifications) 호출과 표시용 순수 함수 (posselect-shell#79, gateway#180).
//
// 헤더는 로그인 전 화면에도 떠 있지만 알림 API 는 로그인 상태에서만 부른다 — 호출부(Header)가
// /api/auth/me 성공 뒤에만 이 함수들을 쓴다. customer 호스트는 로그인 강제 호스트라, 쿠키 없이 부르면
// 401 이 아니라 로그인 페이지로 302 가 나가고 교차 출처 fetch 는 그걸 실패로 본다. 그래서 여기 함수들은
// 어떤 실패든 "알림 없음"으로 조용히 떨어진다 — 알림 때문에 헤더가 깨져선 안 된다.

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationInbox {
  unreadCount: number;
  items: NotificationItem[];
}

/** 배지에 그대로 찍으면 버튼을 넘치므로 두 자리까지만 보여 준다. */
export const BADGE_MAX = 99;

/** 안 읽은 개수를 다시 확인하는 주기. 실시간 채널(SSE/WebSocket) 없이 폴링으로 갱신한다. */
export const UNREAD_POLL_INTERVAL_MS = 60_000;

export function badgeLabel(unreadCount: number): string {
  return unreadCount > BADGE_MAX ? `${BADGE_MAX}+` : String(unreadCount);
}

/**
 * 알림의 링크를 href 에 넣어도 되는지 본다. 서버가 https 만 받지만, 이 번들은 네 개 사이트에 그대로
 * 실리므로 여기서도 한 번 더 막는다 — posselect.com 계열 https 주소만 통과시키고 나머지는 링크 없이 보여 준다.
 */
export function safeLink(linkUrl: string | null | undefined): string | null {
  if (!linkUrl) return null;
  try {
    const url = new URL(linkUrl);
    const host = url.hostname;
    const ours = host === 'posselect.com' || host.endsWith('.posselect.com');
    return url.protocol === 'https:' && ours ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * "방금 전 / n분 전 / n시간 전 / n일 전", 일주일이 넘으면 날짜.
 * 서버는 오프셋이 붙은 시각(예: 2026-10-04T06:50:00Z)을 준다 — 서버(UTC)와 브라우저의 시간대가 달라도 맞는다.
 */
export function relativeTime(createdAt: string, now: Date = new Date()): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '';
  const minutes = Math.floor((now.getTime() - created.getTime()) / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${created.getFullYear()}.${created.getMonth() + 1}.${created.getDate()}`;
}

export async function fetchUnreadCount(authApiBase: string): Promise<number> {
  try {
    const res = await fetch(`${authApiBase}/api/auth/notifications/unread-count`, { credentials: 'include' });
    if (!res.ok) return 0;
    const data: { unreadCount?: unknown } = await res.json();
    return typeof data.unreadCount === 'number' ? data.unreadCount : 0;
  } catch {
    return 0;
  }
}

export async function fetchInbox(authApiBase: string): Promise<NotificationInbox | null> {
  try {
    const res = await fetch(`${authApiBase}/api/auth/notifications?size=20`, { credentials: 'include' });
    if (!res.ok) return null;
    const data: Partial<NotificationInbox> = await res.json();
    return {
      unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch {
    return null;
  }
}

// 읽음 처리는 본문·Content-Type 없는 POST 다 — 교차 출처에서도 프리플라이트 없이 나가는 단순 요청으로 둔다.
// keepalive: 알림을 누르면 곧바로 링크로 이동하는데, 그 이동이 요청을 끊지 않게 한다.
export async function markRead(authApiBase: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(`${authApiBase}/api/auth/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function markAllRead(authApiBase: string): Promise<boolean> {
  try {
    const res = await fetch(`${authApiBase}/api/auth/notifications/read-all`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}
