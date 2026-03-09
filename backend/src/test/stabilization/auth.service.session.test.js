jest.mock("../../db", () => ({
  models: {
    Usuario: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
    },
  },
}));

jest.mock("../../utils/crypto", () => ({
  comparePassword: jest.fn(),
}));

const { models } = require("../../db");
const { comparePassword } = require("../../utils/crypto");
const authService = require("../../modules/auth/auth.service");
const { verifyAccess, signRefreshToken } = require("../../utils/jwt");

function buildUser(overrides = {}) {
  return {
    id: 101,
    nombres: "Juan",
    apellidos: "Prueba",
    email: "juan@finca.test",
    estado: "Activo",
    role_id: 2,
    password_hash: "hash",
    Role: { nombre: "Tecnico" },
    ...overrides,
  };
}

describe("auth.service sesión", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("login exitoso emite access token con claims de sesión", async () => {
    models.Usuario.findOne.mockResolvedValue(buildUser());
    comparePassword.mockResolvedValue(true);

    const result = await authService.login("juan@finca.test", "secret");
    const payload = verifyAccess(result.tokens.access);

    expect(result.user.email).toBe("juan@finca.test");
    expect(payload.sub).toBe(101);
    expect(payload.role).toBe("Tecnico");
    expect(payload.sid).toBeTruthy();
    expect(typeof payload.session_start_at).toBe("number");
    expect(typeof payload.last_activity_at).toBe("number");
  });

  test("refresh rechaza inactividad mayor a 60 minutos", async () => {
    const now = Date.now();
    const refresh = signRefreshToken({
      sub: 101,
      role: "Tecnico",
      sid: "sid-1",
      session_start_at: now - 90 * 60 * 1000,
      last_activity_at: now - 61 * 60 * 1000,
    });

    await expect(authService.refresh(refresh)).rejects.toMatchObject({
      code: "AUTH_SESSION_EXPIRED_INACTIVITY",
      status: 401,
    });
  });

  test("refresh rechaza sesiones con máximo total mayor a 8 horas", async () => {
    const now = Date.now();
    const refresh = signRefreshToken({
      sub: 101,
      role: "Tecnico",
      sid: "sid-2",
      session_start_at: now - (8 * 60 * 60 * 1000 + 10_000),
      last_activity_at: now - 10 * 60 * 1000,
    });

    await expect(authService.refresh(refresh)).rejects.toMatchObject({
      code: "AUTH_SESSION_EXPIRED_MAX",
      status: 401,
    });
  });

  test("refresh válido mantiene inicio y actualiza last_activity con hint", async () => {
    const now = Date.now();
    const user = buildUser();
    models.Usuario.findByPk.mockResolvedValue(user);

    const refresh = signRefreshToken({
      sub: 101,
      role: "Tecnico",
      sid: "sid-3",
      session_start_at: now - 2 * 60 * 60 * 1000,
      last_activity_at: now - 20 * 60 * 1000,
    });

    const response = await authService.refresh(refresh, {
      activityHint: String(now - 2 * 60 * 1000),
    });

    const payload = verifyAccess(response.tokens.access);
    expect(payload.session_start_at).toBe(now - 2 * 60 * 60 * 1000);
    expect(payload.last_activity_at).toBe(now - 2 * 60 * 1000);
    expect(payload.sid).toBe("sid-3");
  });
});

