
README - Acortador de URLs + QR

=====================================
🔗 Acortador de URLs + QR
=====================================

Un acortador de enlaces moderno con generación de códigos QR, panel de historial y búsqueda, construido con Node.js, Express, PostgreSQL y Prisma.

Diseñado con una interfaz minimalista inspirada en el estilo Apple.

-------------------------------------
✨ Características
-------------------------------------

- Crear enlaces cortos
- Generar códigos QR
- Contador de clics
- Panel de historial
- Búsqueda de enlaces
- Eliminar enlaces
- Copiar URL corta
- Descargar QR en PNG
- Interfaz moderna minimalista
- API REST

-------------------------------------
🧠 Tecnologías utilizadas
-------------------------------------

Backend:
- Node.js
- Express
- Prisma ORM
- PostgreSQL

Frontend:
- JavaScript Vanilla
- HTML + CSS (estilo glassmorphism)

Otros:
- NanoID (códigos únicos)
- Generación de QR
- Validación con Zod
- Seguridad con Helmet
- Logs con Morgan

-------------------------------------
🚀 Cómo ejecutar el proyecto
-------------------------------------

1) Clonar repositorio

git clone https://github.com/TU_USUARIO/url-shortener-qr.git
cd url-shortener-qr

2) Instalar dependencias

npm install

3) Crear archivo .env

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/shortener"
BASE_URL="http://localhost:3000"
PORT=3000

4) Ejecutar migraciones

npx prisma migrate dev

5) Iniciar servidor

npm run dev

Abrir en navegador:

http://localhost:3000

-------------------------------------
📡 Endpoints de la API
-------------------------------------

Crear enlace:

POST /api/links

Body:
{
  "url": "https://example.com"
}

Obtener enlaces (con búsqueda):

GET /api/links?q=texto

Eliminar enlace:

DELETE /api/links/:code

Redirección:

GET /:code

-------------------------------------
📁 Estructura del proyecto
-------------------------------------

url-shortener-qr/

public/
  index.html
  app.js

prisma/
  schema.prisma

src/
  server.js

.env
package.json
README.txt

-------------------------------------
🔒 Seguridad
-------------------------------------

- Middleware Helmet
- Validación de inputs con Zod
- Variables de entorno protegidas

-------------------------------------
🛠️ Mejoras futuras
-------------------------------------

- Autenticación de usuarios
- Panel de analíticas
- Alias personalizados
- Expiración de enlaces
- Rate limiting
- API pública con tokens
- Seguimiento geográfico
- Docker
- Pipeline de despliegue

-------------------------------------
🌍 Ideas de despliegue
-------------------------------------

Backend: Render / Railway / Fly.io
Base de datos: Neon / Supabase
Dominio: Personalizado

-------------------------------------
👨‍💻 Autor
-------------------------------------

Chris — Desarrollador Full Stack

GitHub: https://github.com/TU_USUARIO

-------------------------------------
📜 Licencia
-------------------------------------

Licencia MIT — libre uso y modificación.

