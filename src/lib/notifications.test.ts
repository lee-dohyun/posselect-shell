import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  badgeLabel,
  fetchInbox,
  fetchUnreadCount,
  markAllRead,
  markRead,
  relativeTime,
  safeLink,
} from './notifications';

const BASE = 'https://customer.posselect.com';

function mockFetch(response: Partial<Response> | Error) {
  const fn = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('notifications', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('badgeLabel', () => {
    it('99 까지는 그대로, 넘으면 99+', () => {
      expect(badgeLabel(1)).toBe('1');
      expect(badgeLabel(99)).toBe('99');
      expect(badgeLabel(100)).toBe('99+');
    });
  });

  describe('safeLink', () => {
    it('posselect.com 계열 https 주소만 통과시킨다', () => {
      expect(safeLink('https://customer.posselect.com/mypage')).toBe('https://customer.posselect.com/mypage');
      expect(safeLink('https://posselect.com/')).toBe('https://posselect.com/');
    });

    it('다른 도메인·다른 스킴·깨진 값은 링크로 쓰지 않는다', () => {
      expect(safeLink('https://evil.example.com/')).toBeNull();
      expect(safeLink('https://posselect.com.evil.example/')).toBeNull();
      expect(safeLink('https://notposselect.com/')).toBeNull();
      expect(safeLink('http://customer.posselect.com/mypage')).toBeNull();
      expect(safeLink('javascript:alert(1)')).toBeNull();
      expect(safeLink('/mypage')).toBeNull();
      expect(safeLink(null)).toBeNull();
      expect(safeLink('')).toBeNull();
    });
  });

  describe('relativeTime', () => {
    const now = new Date('2026-10-02T12:00:00');

    it('분·시간·일 단위로 줄여 보여 준다', () => {
      expect(relativeTime('2026-10-02T11:59:40', now)).toBe('방금 전');
      expect(relativeTime('2026-10-02T11:30:00', now)).toBe('30분 전');
      expect(relativeTime('2026-10-02T09:00:00', now)).toBe('3시간 전');
      expect(relativeTime('2026-09-30T12:00:00', now)).toBe('2일 전');
    });

    it('오프셋이 붙은 서버 시각(UTC)을 브라우저 시간대와 무관하게 같은 순간으로 읽는다', () => {
      const utcNow = new Date('2026-10-04T07:00:00Z');
      expect(relativeTime('2026-10-04T06:50:00Z', utcNow)).toBe('10분 전');
      expect(relativeTime('2026-10-04T15:50:00+09:00', utcNow)).toBe('10분 전');
    });

    it('일주일이 넘으면 날짜, 해석 못 하는 값은 빈 문자열', () => {
      expect(relativeTime('2026-09-01T12:00:00', now)).toBe('2026.9.1');
      expect(relativeTime('not-a-date', now)).toBe('');
    });
  });

  describe('fetchUnreadCount', () => {
    it('쿠키를 실어 unread-count 를 부르고 숫자를 돌려준다', async () => {
      const fetchFn = mockFetch({ ok: true, json: async () => ({ unreadCount: 3 }) });

      await expect(fetchUnreadCount(BASE)).resolves.toBe(3);
      expect(fetchFn).toHaveBeenCalledWith(`${BASE}/api/auth/notifications/unread-count`, { credentials: 'include' });
    });

    it('비로그인(401)·회원 행 없음(404)·네트워크 실패는 전부 0', async () => {
      mockFetch({ ok: false, status: 401 });
      await expect(fetchUnreadCount(BASE)).resolves.toBe(0);
      mockFetch(new TypeError('Failed to fetch'));
      await expect(fetchUnreadCount(BASE)).resolves.toBe(0);
      mockFetch({ ok: true, json: async () => ({}) });
      await expect(fetchUnreadCount(BASE)).resolves.toBe(0);
    });
  });

  describe('fetchInbox', () => {
    it('목록과 안 읽은 개수를 돌려준다', async () => {
      const item = {
        id: 'a',
        type: 'ORDER_PAID',
        title: '결제가 완료되었습니다',
        body: null,
        linkUrl: null,
        read: false,
        createdAt: '2026-10-02T12:00:00',
      };
      mockFetch({ ok: true, json: async () => ({ unreadCount: 1, items: [item] }) });

      await expect(fetchInbox(BASE)).resolves.toEqual({ unreadCount: 1, items: [item] });
    });

    it('실패하면 null', async () => {
      mockFetch({ ok: false, status: 500 });
      await expect(fetchInbox(BASE)).resolves.toBeNull();
      mockFetch(new TypeError('Failed to fetch'));
      await expect(fetchInbox(BASE)).resolves.toBeNull();
    });
  });

  describe('읽음 처리', () => {
    it('한 건 읽음은 본문 없는 POST(단순 요청)이고 keepalive 로 나간다', async () => {
      const fetchFn = mockFetch({ ok: true });

      await expect(markRead(BASE, 'id-1')).resolves.toBe(true);
      expect(fetchFn).toHaveBeenCalledWith(`${BASE}/api/auth/notifications/id-1/read`, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      });
    });

    it('전체 읽음과 실패 처리', async () => {
      const fetchFn = mockFetch({ ok: true });
      await expect(markAllRead(BASE)).resolves.toBe(true);
      expect(fetchFn).toHaveBeenCalledWith(`${BASE}/api/auth/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });

      mockFetch(new TypeError('Failed to fetch'));
      await expect(markRead(BASE, 'id-1')).resolves.toBe(false);
      await expect(markAllRead(BASE)).resolves.toBe(false);
    });
  });
});
