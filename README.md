# Práctica No. 1 — Angular y API REST

Aplicación Angular para consultar personajes de cuatro universos y un backend REST para administrar productos.

## Carpetas

- `frontend/`: aplicación Angular.
- `backend/`: API REST con Prisma y MySQL.

## Requisitos

Node.js y npm. Para los datos del backend también se necesita MySQL.

## Ejecutar frontend

```bash
cd frontend
npm install
npm start
```

Abre `http://localhost:4200`.

## Ejecutar backend

Consulta `backend/README.md` para crear la base de datos y configurar las variables locales. Copia `backend/.env.example` como `backend/.env`, completa los valores de tu equipo y luego:

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

El archivo `.env` local y los datos de acceso no se incluyen en este repositorio.
