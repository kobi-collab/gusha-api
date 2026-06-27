import { describe, expect, it } from "vitest";
import {
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  getAvatarColor,
  formatDistance,
  formatTime,
  DEFAULT_PROFILE,
} from "../lib/mock-data";
import { DEMO_NEARBY_USERS, DEMO_CONVERSATIONS } from "../lib/demo-data";

describe("Mock Data", () => {
  it("should have nearby users with required fields", () => {
    expect(DEMO_NEARBY_USERS.length).toBeGreaterThan(0);
    for (const user of DEMO_NEARBY_USERS) {
      expect(user.id).toBeTruthy();
      expect(user.name).toBeTruthy();
      expect(user.age).toBeGreaterThanOrEqual(18);
      expect(user.age).toBeLessThanOrEqual(99);
      expect(user.distance).toBeGreaterThan(0);
      expect(user.bearing).toBeGreaterThanOrEqual(0);
      expect(user.bearing).toBeLessThanOrEqual(360);
      expect(typeof user.isOnline).toBe("boolean");
      expect(Array.isArray(user.interests)).toBe(true);
    }
  });

  it("should have unique user IDs", () => {
    const ids = DEMO_NEARBY_USERS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have conversations referencing valid demo users", () => {
    const userIds = DEMO_NEARBY_USERS.map((u) => u.id);
    for (const conv of DEMO_CONVERSATIONS) {
      expect(userIds).toContain(conv.userId);
      expect(conv.userName).toBeTruthy();
      expect(conv.lastMessage).toBeTruthy();
      expect(conv.lastMessageTime).toBeGreaterThan(0);
    }
  });

  it("should have messages for each conversation", () => {
    for (const conv of MOCK_CONVERSATIONS) {
      const messages = MOCK_MESSAGES[conv.id];
      expect(messages).toBeDefined();
      expect(messages.length).toBeGreaterThan(0);
      for (const msg of messages) {
        expect(msg.id).toBeTruthy();
        expect(msg.text).toBeTruthy();
        expect(msg.timestamp).toBeGreaterThan(0);
      }
    }
  });
});

describe("getAvatarColor", () => {
  it("should return a hex color string", () => {
    const color = getAvatarColor("u1");
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("should return consistent color for same ID", () => {
    const color1 = getAvatarColor("u1");
    const color2 = getAvatarColor("u1");
    expect(color1).toBe(color2);
  });

  it("should handle different IDs", () => {
    const color1 = getAvatarColor("u1");
    const color2 = getAvatarColor("u2");
    // They might be the same or different, but both should be valid
    expect(color1).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(color2).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe("formatDistance", () => {
  it("should format meters for distances under 1km", () => {
    expect(formatDistance(350)).toBe("350m");
    expect(formatDistance(999)).toBe("999m");
    expect(formatDistance(50)).toBe("50m");
  });

  it("should format kilometers for distances 1km and above", () => {
    expect(formatDistance(1000)).toBe("1.0km");
    expect(formatDistance(1500)).toBe("1.5km");
    expect(formatDistance(2200)).toBe("2.2km");
  });
});

describe("formatTime", () => {
  it("should format recent times as 'now'", () => {
    expect(formatTime(Date.now())).toBe("now");
    expect(formatTime(Date.now() - 30000)).toBe("now"); // 30 seconds
  });

  it("should format minutes", () => {
    expect(formatTime(Date.now() - 1000 * 60 * 5)).toBe("5m");
    expect(formatTime(Date.now() - 1000 * 60 * 30)).toBe("30m");
  });

  it("should format hours", () => {
    expect(formatTime(Date.now() - 1000 * 60 * 60 * 2)).toBe("2h");
    expect(formatTime(Date.now() - 1000 * 60 * 60 * 12)).toBe("12h");
  });

  it("should format days", () => {
    expect(formatTime(Date.now() - 1000 * 60 * 60 * 48)).toBe("2d");
  });
});

describe("DEFAULT_PROFILE", () => {
  it("should have valid default values", () => {
    expect(DEFAULT_PROFILE.id).toBe("me");
    expect(DEFAULT_PROFILE.name).toBe("");
    expect(DEFAULT_PROFILE.age).toBeGreaterThanOrEqual(18);
    expect(DEFAULT_PROFILE.isVisible).toBe(false);
    expect(DEFAULT_PROFILE.maxDistance).toBeGreaterThan(0);
    expect(Array.isArray(DEFAULT_PROFILE.interests)).toBe(true);
  });
});
