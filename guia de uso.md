# Guía de Uso

Comandos para operar el proyecto con Docker en:
- Linux Ubuntu (bash)
- Windows PowerShell

## 0) Revisión rápida actual (importante)
- `docker-compose.prod.yml` levanta `db` + `api` (no levanta `frontend`).
- `api` expone `8080:3000`.
- `prod` siempre usa `backend/.env.prod` (`./prod` y `.\prod.cmd`).
- En `backend/.env.prod` debes cambiar secretos placeholder (`prod_secret_change_me`).
- En `frontend/.env.prod`, para VPS NO uses `http://localhost:8080`.

## 1) Estado actual de Docker
- `dev`: usa `docker-compose.yml + docker-compose.dev.yml` (db + api + pgadmin).
- `prod`: usa `docker-compose.yml + docker-compose.prod.yml` (db + api).
- Scripts wrapper:
  - Linux: `./dev`, `./prod`
  - Windows: `.\dev.cmd`, `.\prod.cmd`

`prod` siempre carga variables desde `backend/.env.prod`.

## 2) Requisitos
- Docker instalado
- Docker Compose v2 (`docker compose version`)
- Ejecutar comandos desde la raíz del repo

---

## 3) Linux Ubuntu (bash)

### Primera vez
```bash
cd /ruta/a/finca-magdalena-software
chmod +x dev prod scripts/compose.sh
```

### DEV
Levantar:
```bash
./dev up --build -d
```

Estado y logs:
```bash
./dev ps
./dev logs -f api db
```

Bajar:
```bash
./dev down
```

Bajar y borrar DB (limpio total):
```bash
./dev down -v
```

Seed:
```bash
./dev exec api npm run seed
```

Flujo limpio + seed:
```bash
./dev down -v
./dev up --build -d
./dev exec api npm run seed
```

### PROD
Levantar:
```bash
./prod up --build -d
```

Estado y logs:
```bash
./prod ps
./prod logs -f api db
```

Bajar:
```bash
./prod down
```

Bajar y borrar DB (limpio total):
```bash
./prod down -v
```

Health:
```bash
curl -i http://127.0.0.1:8080/health
```

Seed en prod (solo inicialización):
```bash
./prod exec api sh -lc "ALLOW_PROD_SEED=true npm run seed"
```

---

## 4) Windows PowerShell

### DEV
Levantar:
```powershell
.\dev.cmd up --build -d
```

Estado y logs:
```powershell
.\dev.cmd ps
.\dev.cmd logs -f api db
```

Bajar:
```powershell
.\dev.cmd down
```

Bajar y borrar DB (limpio total):
```powershell
.\dev.cmd down -v
```

Seed:
```powershell
.\dev.cmd exec api npm run seed
```

Flujo limpio + seed:
```powershell
.\dev.cmd down -v
.\dev.cmd up --build -d
.\dev.cmd exec api npm run seed
```

### PROD
Levantar:
```powershell
.\prod.cmd up --build -d
```

Estado y logs:
```powershell
.\prod.cmd ps
.\prod.cmd logs -f api db
```

Bajar:
```powershell
.\prod.cmd down
```

Bajar y borrar DB (limpio total):
```powershell
.\prod.cmd down -v
```

Health:
```powershell
curl.exe -i http://127.0.0.1:8080/health
```

Seed en prod (solo inicialización):
```powershell
.\prod.cmd exec api sh -lc "ALLOW_PROD_SEED=true npm run seed"
```

---

## 5) Preparación para VPS (Hostinger Docker)

### Variables críticas en `backend/.env.prod`
Debes definir valores reales:
- `DB_NAME`, `DB_USER`, `DB_PASS`
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (secretos fuertes)
- `FRONTEND_URL` (dominio real del frontend)

Ejemplo en VPS:
```env
FRONTEND_URL=https://app.tudominio.com
```

Para pruebas locales puedes agregar múltiples orígenes separados por coma:
```env
FRONTEND_URL=https://app.tudominio.com,http://localhost:4173,http://localhost:5173
```

### `frontend/.env.prod` (muy importante)
Si frontend y backend están detrás del mismo dominio/proxy:
```env
VITE_API_BASE_URL=/api
```

Si frontend apunta directo al backend por dominio/puerto:
```env
VITE_API_BASE_URL=https://api.tudominio.com
```

No dejar en VPS:
```env
VITE_API_BASE_URL=http://localhost:8080
```

### Recomendaciones antes de subir
- No dejar `DB_PASS` débil.
- No dejar secretos de ejemplo (`prod_secret_change_me`).
- En VPS final, quitar `localhost` de `FRONTEND_URL`.
- El warning de `version:` en `docker-compose.prod.yml` no bloquea, pero conviene eliminar esa línea.

---

## 6) Despliegue inicial en VPS desde GitHub

```bash
cd /opt
git clone <URL-REPO> finca-magdalena-software
cd finca-magdalena-software
chmod +x dev prod scripts/compose.sh
```

Editar `backend/.env.prod` con valores reales y luego:
```bash
./prod up --build -d
./prod ps
./prod logs -f api db
curl -i http://127.0.0.1:8080/health
```

Si es instalación limpia y necesitas datos base:
```bash
./prod exec api sh -lc "ALLOW_PROD_SEED=true npm run seed"
```

---

## 7) Cómo traer cambios a producción (update deploy)

En el VPS, desde la raíz del proyecto:
```bash
cd /opt/finca-magdalena-software
git fetch --all --prune
git pull --ff-only origin main
./prod up --build -d
./prod ps
./prod logs --tail=150 api
curl -i http://127.0.0.1:8080/health
```

### Flujo recomendado en cada actualización
1. Respaldar base de datos antes del deploy.
2. Traer cambios de GitHub (`git fetch` + `git pull --ff-only`).
3. Reconstruir y levantar (`./prod up --build -d`).
4. Verificar salud (`./prod ps`, logs API, `/health`).
5. Si hubo cambios de catálogos iniciales, correr seed solo si aplica y en ventana controlada.

### Si cambió estructura de DB y necesitas reinicio limpio
**Advertencia: borra datos**
```bash
./prod down -v
./prod up --build -d
./prod exec api sh -lc "ALLOW_PROD_SEED=true npm run seed"
```

---

## 8) Notas importantes
- `down -v` elimina datos de PostgreSQL del stack.
- El seed de este proyecto usa `RESET=true` en tablas base del seed.
- En producción, corre seed solo en inicialización o reinicio controlado.
- Si ves warning por `version:` en compose, no bloquea; puedes eliminar esa línea para evitar ruido.
