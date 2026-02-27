# Comandos Docker Rapidos (Dev y Prod)

Se agregaron wrappers para no escribir siempre `docker compose -f ...`.

## Donde estan

Windows:
- `C:\Users\alexc\Proyectos\finca-magdalena-software\dev.cmd`
- `C:\Users\alexc\Proyectos\finca-magdalena-software\prod.cmd`
- `C:\Users\alexc\Proyectos\finca-magdalena-software\scripts\compose.ps1`

Linux/Ubuntu:
- `/ruta/a/finca-magdalena-software/dev`
- `/ruta/a/finca-magdalena-software/prod`
- `/ruta/a/finca-magdalena-software/scripts/compose.sh`

## Ubuntu Server (bash)

Desde la raiz del repo:

Primera vez (si hace falta):

```bash
chmod +x dev prod scripts/compose.sh
```

DEV:

```bash
./dev
./dev up --build -d
./dev down
./dev logs -f api
./dev ps
```

PROD:

```bash
./prod
./prod up --build -d
./prod down
./prod logs -f api
./prod ps
```

## Windows (PowerShell)

Desde la raiz del repo:

DEV:

```powershell
.\dev.cmd
.\dev.cmd up --build -d
.\dev.cmd down
.\dev.cmd logs -f api
.\dev.cmd ps
```

PROD:

```powershell
.\prod.cmd
.\prod.cmd up --build -d
.\prod.cmd down
.\prod.cmd logs -f api
.\prod.cmd ps
```

## Nota sobre `docker compose dev`

Docker Compose no soporta subcomandos custom tipo `docker compose dev` de forma nativa.
Por eso se usan wrappers (`./dev`, `./prod`, `.\dev.cmd`, `.\prod.cmd`).
