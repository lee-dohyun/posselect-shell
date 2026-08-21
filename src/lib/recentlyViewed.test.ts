import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RECENTLY_VIEWED_CHANGE_EVENT,
  RECENTLY_VIEWED_STORAGE_KEY,
  addRecentlyViewed,
  clearRecentlyViewed,
  getRecentlyViewed,
  type RecentlyViewedItem,
} from './recentlyViewed';

function makeItem(overrides: Partial<Omit<RecentlyViewedItem, 'viewedAt'>> = {}) {
  return {
    id: 1,
    name: '테스트 상품',
    price: 10000,
    imageUrl: 'https://cdn.posselect.com/1.jpg',
    href: '/products/1',
    ...overrides,
  };
}

describe('recentlyViewed', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts empty', () => {
    expect(getRecentlyViewed()).toEqual([]);
  });

  it('adds an item and makes it retrievable', () => {
    addRecentlyViewed(makeItem({ id: 1, name: '상품 A' }));

    const items = getRecentlyViewed();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 1, name: '상품 A' });
    expect(typeof items[0].viewedAt).toBe('number');
  });

  it('prepends newly viewed items (most recent first)', () => {
    addRecentlyViewed(makeItem({ id: 1, name: '상품 A' }));
    addRecentlyViewed(makeItem({ id: 2, name: '상품 B' }));

    const items = getRecentlyViewed();
    expect(items.map((item) => item.id)).toEqual([2, 1]);
  });

  it('de-dupes by id, moving the re-viewed item back to the front', () => {
    addRecentlyViewed(makeItem({ id: 1, name: '상품 A' }));
    addRecentlyViewed(makeItem({ id: 2, name: '상품 B' }));
    addRecentlyViewed(makeItem({ id: 1, name: '상품 A (재조회)' }));

    const items = getRecentlyViewed();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: 1, name: '상품 A (재조회)' });
    expect(items[1]).toMatchObject({ id: 2 });
  });

  it('caps the list at 20 items, dropping the oldest', () => {
    for (let id = 1; id <= 21; id += 1) {
      addRecentlyViewed(makeItem({ id, name: `상품 ${id}` }));
    }

    const items = getRecentlyViewed();
    expect(items).toHaveLength(20);
    // Most recently added (id 21) is first; the oldest (id 1) was evicted.
    expect(items[0].id).toBe(21);
    expect(items.map((item) => item.id)).not.toContain(1);
  });

  it('clears all items', () => {
    addRecentlyViewed(makeItem({ id: 1 }));
    addRecentlyViewed(makeItem({ id: 2 }));

    clearRecentlyViewed();

    expect(getRecentlyViewed()).toEqual([]);
  });

  it('persists to localStorage under the documented key', () => {
    addRecentlyViewed(makeItem({ id: 1 }));

    const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });

  it('dispatches a same-tab change event on write so mounted headers can react', () => {
    const handler = vi.fn();
    window.addEventListener(RECENTLY_VIEWED_CHANGE_EVENT, handler);

    addRecentlyViewed(makeItem({ id: 1 }));

    expect(handler).toHaveBeenCalledTimes(1);

    clearRecentlyViewed();

    expect(handler).toHaveBeenCalledTimes(2);

    window.removeEventListener(RECENTLY_VIEWED_CHANGE_EVENT, handler);
  });

  it('treats corrupted JSON in storage as an empty list instead of throwing', () => {
    window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, '{not valid json');

    expect(() => getRecentlyViewed()).not.toThrow();
    expect(getRecentlyViewed()).toEqual([]);
  });

  it('treats a non-array JSON value in storage as an empty list', () => {
    window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify({ not: 'an array' }));

    expect(getRecentlyViewed()).toEqual([]);
  });
});
