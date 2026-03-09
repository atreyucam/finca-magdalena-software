const {
  assertSessionWithinBounds,
  buildNewSession,
  resolveSessionFromRefreshPayload,
} = require("../../modules/auth/session.policy");

describe("session.policy", () => {
  test("crea una sesión nueva con sid y timestamps", () => {
    const now = Date.now();
    const session = buildNewSession(now);

    expect(typeof session.sid).toBe("string");
    expect(session.sid.length).toBeGreaterThan(10);
    expect(session.sessionStartAt).toBe(now);
    expect(session.lastActivityAt).toBe(now);
  });

  test("rechaza sesión por inactividad > 60 minutos", () => {
    const now = Date.now();
    expect(() =>
      assertSessionWithinBounds({
        sessionStartAt: now - 30 * 60 * 1000,
        lastActivityAt: now - 61 * 60 * 1000,
        now,
      })
    ).toThrow(/inactividad/i);
  });

  test("rechaza sesión por máximo total > 8 horas", () => {
    const now = Date.now();
    expect(() =>
      assertSessionWithinBounds({
        sessionStartAt: now - (8 * 60 * 60 * 1000 + 1),
        lastActivityAt: now - 10 * 60 * 1000,
        now,
      })
    ).toThrow(/8 horas/i);
  });

  test("refresh usa activityHint válido sin permitir fechas futuras", () => {
    const now = Date.now();
    const payload = {
      sid: "sid-1",
      session_start_at: now - 30 * 60 * 1000,
      last_activity_at: now - 20 * 60 * 1000,
      iat: Math.floor((now - 30 * 60 * 1000) / 1000),
    };

    const updated = resolveSessionFromRefreshPayload(
      payload,
      String(now - 5 * 60 * 1000),
      now
    );
    expect(updated.lastActivityAt).toBe(now - 5 * 60 * 1000);

    const ignoredFuture = resolveSessionFromRefreshPayload(
      payload,
      String(now + 5 * 60 * 1000),
      now
    );
    expect(ignoredFuture.lastActivityAt).toBe(payload.last_activity_at);
  });
});

