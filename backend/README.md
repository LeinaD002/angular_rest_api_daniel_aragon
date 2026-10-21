# Backend REST para Angular 20: productos e inventario

API didáctica con Node.js, TypeScript, Express, Prisma ORM y MySQL. Está pensada para ejecutarse localmente y ser consumida desde Angular 20.

> **Autenticación:** usa HTTP Basic Authentication configurada mediante variables de entorno. No incluye pantalla de login, endpoint de login ni JWT. Basic Auth solo codifica las credenciales en Base64; no las cifra. Úsala con HTTPS fuera de `localhost`.

## Requisitos

- Node.js 20.19 o superior (se recomienda una versión LTS vigente).
- npm.
- Una instalación local de MySQL 8.x en ejecución.
- Git (opcional, para clonar el repositorio).

Comprueba versiones:

```bash
node -v
npm -v
mysql --version
```

## 1. Instalar dependencias

Desde la carpeta del proyecto:

```bash
npm install
```

## 2. Configurar variables de entorno

Copia `.env.example` a `.env`.

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Puedes cambiar `BASIC_AUTH_USERNAME` y `BASIC_AUTH_PASSWORD`. Usa exactamente esos valores al probar la API.

## 3. Preparar MySQL local (sin Docker)

Este proyecto se conecta a una instancia de MySQL ya instalada en tu equipo. **No necesita Docker.** Para evitar alterar otras aplicaciones o datos, crea dos bases de datos exclusivas y vacías: `products_db` (tablas de la API) y `products_shadow` (uso interno de Prisma Migrate). No apuntes `DATABASE_URL` a una base con datos importantes o tablas existentes.

Inicia sesión en MySQL con un usuario administrador (por ejemplo, `root`; el comando exacto depende de cómo instalaste MySQL):

```bash
mysql -u root -p
```

En la consola de MySQL ejecuta lo siguiente. Puedes cambiar la contraseña de ejemplo por una propia:

```sql
CREATE DATABASE IF NOT EXISTS products_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS products_shadow
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'app_user'@'localhost'
  IDENTIFIED BY 'app_password_local';
GRANT ALL PRIVILEGES ON products_db.* TO 'app_user'@'localhost';
GRANT ALL PRIVILEGES ON products_shadow.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;
```

Si `app_user` ya existe, cambia su contraseña con `ALTER USER` o utiliza tu usuario actual y actualiza las URLs de `.env`. En algunas instalaciones el usuario puede necesitar estar definido como `'app_user'@'127.0.0.1'` o `'app_user'@'%'`; el host debe coincidir con la forma en que MySQL autentica la conexión. No es necesario ejecutar `FLUSH PRIVILEGES` después de `CREATE USER`/`GRANT`, pero se deja aquí para claridad didáctica.

Copia `.env.example` a `.env` y ajusta las dos URLs con el usuario, contraseña y puerto reales. Para MySQL local normalmente el puerto es `3306`:

```env
DATABASE_URL="mysql://app_user:app_password_local@localhost:3306/products_db"
SHADOW_DATABASE_URL="mysql://app_user:app_password_local@localhost:3306/products_shadow"
```

Si la contraseña contiene caracteres especiales como `@`, `#`, `:` o `/`, codifícala para URL (percent-encoding) antes de ponerla en la cadena de conexión. Si tu MySQL escucha en otro puerto, cambia `3306` en ambas URLs.

`products_shadow` es una base auxiliar para Prisma: debe existir, estar vacía y ser exclusiva de este proyecto. Prisma la limpia y la utiliza durante `migrate dev`; no guardes datos de la aplicación ahí.

## 4. Crear tablas y datos de prueba

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

El seed crea tres categorías y **100 productos de demostración** repartidos entre Computación, Accesorios y Audio. Incluye existencias variadas (también productos con inventario bajo) para practicar búsquedas, filtros, ordenamiento y paginación. Es seguro volverlo a ejecutar: usa `upsert` por nombre de categoría y SKU, por lo que no duplica estos registros.

Para comprobar la carga, inicia el backend y consulta `GET /api/v1/products?page=1&limit=100`; la respuesta de paginación debe mostrar `meta.totalItems` igual o superior a `100` si la base de datos estaba vacía antes de ejecutar el seed.

## 5. Ejecutar el backend

```bash
npm run dev
```

URLs:

- API: `http://localhost:3000/api/v1`
- Health check público: `http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/docs`

En Swagger, pulsa **Authorize** e introduce el usuario y la contraseña configurados en `.env`. La documentación incluye las operaciones reales disponibles, los parámetros de búsqueda/paginación, ejemplos de request/response, los esquemas de entrada y los códigos de respuesta.

## Autenticación básica

Las rutas bajo `/api/v1` están protegidas salvo `/api/v1/health`. El encabezado HTTP es:

```http
Authorization: Basic <credenciales-en-base64>
```

Para probar con curl:

```bash
curl -u estudiante:cambiar-esta-clave \
  "http://localhost:3000/api/v1/products?page=1&limit=10"
```

Ajusta usuario y contraseña según tu archivo `.env`. No uses estas credenciales de ejemplo en un sistema expuesto a Internet.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/health` | Estado del servicio (público) |
| GET | `/api/v1/products` | Lista, búsqueda, filtros y paginación |
| GET | `/api/v1/products/:id` | Consulta por ID |
| POST | `/api/v1/products` | Crea producto |
| PATCH | `/api/v1/products/:id` | Actualiza parcialmente |
| DELETE | `/api/v1/products/:id` | Desactiva producto (borrado lógico) |
| GET | `/api/v1/categories` | Lista categorías activas |
| GET | `/api/v1/categories?includeInactive=true` | Lista todas las categorías |
| POST | `/api/v1/categories` | Crea categoría |
| PATCH | `/api/v1/categories/:id` | Actualiza categoría |

Todas las rutas salvo health check requieren Basic Auth. Los endpoints de categorías también están protegidos.

## Parámetros de consulta para productos

Ejemplo:

```http
GET /api/v1/products?page=1&limit=10&search=mouse&categoryId=2&minPrice=100&maxPrice=500&isActive=true&sortBy=name&sortOrder=asc
```

Parámetros disponibles:

- `page`: página, empieza en 1.
- `limit`: resultados por página, de 1 a 100 (predeterminado 10).
- `search`: busca coincidencias en nombre, SKU y descripción.
- `categoryId`: filtra por categoría.
- `minPrice`, `maxPrice`: rango de precio.
- `minStock`, `maxStock`: rango de existencias.
- `lowStock=true`: productos cuyo stock es menor o igual a `minStock`.
- `isActive=true|false`: filtra activos/inactivos.
- `sortBy=name|sku|price|stock|createdAt`.
- `sortOrder=asc|desc`.

Ejemplo con curl:

```bash
curl -u estudiante:cambiar-esta-clave \
  "http://localhost:3000/api/v1/products?page=1&limit=5&search=teclado"
```

## Crear un producto

```bash
curl -u estudiante:cambiar-esta-clave \
  -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "WEB-001",
    "name": "Webcam HD",
    "description": "Webcam para clases virtuales",
    "price": 299.99,
    "stock": 15,
    "minStock": 3,
    "categoryId": 2
  }'
```

Obtén los IDs reales de categorías con `GET /api/v1/categories`.

## Formato de respuesta

Éxito:

```json
{
  "success": true,
  "message": "Productos obtenidos correctamente",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Error:

```json
{
  "success": false,
  "message": "Error de validación",
  "data": null,
  "meta": null,
  "errors": [
    {
      "field": "price",
      "message": "El precio debe ser mayor que cero"
    }
  ]
}
```

## Consumir desde Angular 20

En el entorno de desarrollo de Angular, la aplicación normalmente corre en `http://localhost:4200`, que está permitido por `CORS_ORIGIN`.

Puedes crear un interceptor funcional que añada el encabezado Basic a las peticiones a la API. Para el ejercicio inicial, el ejemplo más simple es:

```typescript
import { HttpInterceptorFn } from '@angular/common/http';

const username = 'estudiante';
const password = 'cambiar-esta-clave';

export const basicAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('http://localhost:3000/api/v1/')) {
    return next(req);
  }

  const token = btoa(`${username}:${password}`);
  return next(req.clone({
    setHeaders: { Authorization: `Basic ${token}` }
  }));
};
```

Regístralo en `app.config.ts`:

```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { basicAuthInterceptor } from './basic-auth.interceptor';

export const appConfig = {
  providers: [
    provideHttpClient(withInterceptors([basicAuthInterceptor]))
  ]
};
```

**Importante para el aula:** las credenciales incluidas en el frontend son visibles para cualquier persona que inspeccione la aplicación. Este ejemplo sirve únicamente para aprendizaje local; no representa una estrategia segura para proteger una aplicación pública. En un proyecto real, usa un esquema de autenticación apropiado y nunca dependas de un secreto embebido en Angular.

## Comandos útiles

```bash
npm run dev            # desarrollo con recarga
npm run build          # compilar TypeScript
npm run typecheck      # comprobar tipos
npm run db:studio      # abrir Prisma Studio
npm run prisma:seed    # insertar/actualizar datos de demostración
```

## Notas de diseño

- La API usa `/api/v1` para versionar los endpoints.
- El borrado de producto es lógico: `DELETE` cambia `isActive` a `false`.
- El precio se almacena como `DECIMAL` en MySQL.
- El stock no puede ser negativo por validación de API.
- Las respuestas de éxito y error siguen un contrato común.
- La paginación y los filtros se aplican en el backend.
- El historial de movimientos, clientes y facturas quedan fuera de esta primera versión.
- Para producción, agrega HTTPS, gestión real de usuarios/roles, rate limiting, pruebas automatizadas y controles de inventario transaccionales.

## Problemas frecuentes

**Error de conexión a MySQL:** comprueba que el servicio local de MySQL esté iniciado, que el puerto sea correcto y que el usuario/contraseña de ambas URLs de `.env` funcionen. Prueba el acceso con `mysql -u app_user -p -h localhost -P 3306`.

**Error P3014 o P1010 al crear la shadow database:** comprueba que `products_shadow` exista y que el usuario configurado tenga permisos sobre ella. Revisa que `SHADOW_DATABASE_URL` esté definido en `.env` y que `prisma/schema.prisma` contenga `shadowDatabaseUrl = env("SHADOW_DATABASE_URL")`.

**Error P2021 (tabla no existe) al ejecutar el seed:** normalmente la migración anterior no terminó correctamente. Corrige primero el error de `migrate dev` y vuelve a ejecutar `npx prisma migrate dev --name init`; después ejecuta `npm run prisma:seed`.

**Angular recibe un error CORS:** comprueba que `CORS_ORIGIN` coincida exactamente con el origen de Angular (por ejemplo, `http://localhost:4200`) y reinicia el backend después de cambiar `.env`.

**Error 401:** comprueba `BASIC_AUTH_USERNAME` y `BASIC_AUTH_PASSWORD` y que Angular/curl envíe el encabezado Authorization.
