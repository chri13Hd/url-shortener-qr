require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { PrismaClient } = require("@prisma/client");
const { nanoid } = require("nanoid");
const QRCode = require("qrcode");
const { z } = require("zod");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false, // 👈 desactiva CSP en dev
  })
);

app.use(morgan("dev"));
app.use(express.json());

app.use(express.static("public"));

/**
 * ✅ Middleware "a prueba de balas":
 * - Si el cliente NO manda Content-Type, Express no parsea nada y req.body queda undefined.
 * - Este middleware recoge el body RAW SIEMPRE (cuando hay contenido) y lo intenta convertir a JSON.
 * - Debe ir ANTES de express.json() para que no se consuma el stream dos veces.
 */
app.use((req, _res, next) => {
  const methodHasBody = ["POST", "PUT", "PATCH"].includes(req.method);

  // Si no debería tener body, seguimos
  if (!methodHasBody) return next();

  // Si ya viene parseado por algún middleware previo, seguimos
  if (req.body !== undefined) return next();

  let data = "";

  req.on("data", (chunk) => {
    data += chunk;
    // protección básica
    if (data.length > 1e6) req.destroy();
  });

  req.on("end", () => {
    if (!data) {
      req.body = undefined;
      return next();
    }

    const trimmed = data.trim();

    // Intento de JSON
    try {
      req.body = JSON.parse(trimmed);
    } catch {
      // Si no es JSON, lo dejamos como texto
      req.body = trimmed;
    }

    return next();
  });
});

// Parseo normal para clientes que sí mandan JSON
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Debug útil
app.use((req, _res, next) => {
  console.log("CONTENT-TYPE:", req.headers["content-type"]);
  console.log("BODY RECIBIDO:", req.body);
  next();
});

// Validación
const createLinkSchema = z.object({
  url: z.string().url(),
});

app.use(express.static("public"));

// Health check
app.get("/api/health", (_, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Crear short url + QR
app.post("/api/links", async (req, res) => {
  try {
    // Si por alguna razón llegó texto, intentamos leerlo
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { url } = createLinkSchema.parse(payload);

    let code = nanoid(7);
    while (await prisma.link.findUnique({ where: { code } })) {
      code = nanoid(7);
    }

    const link = await prisma.link.create({
      data: { originalUrl: url, code },
    });

    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const shortUrl = `${baseUrl}/${code}`;

    const qrDataUrl = await QRCode.toDataURL(shortUrl, { margin: 1, width: 320 });

    res.status(201).json({
      code: link.code,
      originalUrl: link.originalUrl,
      shortUrl,
      qrDataUrl,
      createdAt: link.createdAt,
    });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "URL inválida", details: err.errors });
    }
    // Si el JSON.parse falla en payload cuando llega string roto
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "Body no es JSON válido" });
    }

    console.error(err);
    res.status(500).json({ error: "Error creando el enlace" });
  }
});

// Info del link (antes del /:code)
app.get("/api/links/:code", async (req, res) => {
  const { code } = req.params;

  const link = await prisma.link.findUnique({ where: { code } });
  if (!link) return res.status(404).json({ error: "No existe" });

  const baseUrl =
    process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

  res.json({
    code: link.code,
    originalUrl: link.originalUrl,
    shortUrl: `${baseUrl}/${link.code}`,
    clicks: link.clicks,
    createdAt: link.createdAt,
    lastAccess: link.lastAccess,
  });
});

// QR como PNG directo
app.get("/api/links", async (req, res) => {
  const take = Math.min(parseInt(req.query.take || "20", 10), 100);
  const skip = Math.max(parseInt(req.query.skip || "0", 10), 0);

  const q = (req.query.q || "").toString().trim();

  const baseUrl =
    process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

  // 👇 filtro de búsqueda
  const where = q
    ? {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { originalUrl: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  // 👇 ahora findMany usa where
  const links = await prisma.link.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });

  // 👇 total también con where (muy importante)
  const total = await prisma.link.count({ where });

  res.json({
    total,
    take,
    skip,
    items: links.map((l) => ({
      code: l.code,
      originalUrl: l.originalUrl,
      shortUrl: `${baseUrl}/${l.code}`,
      clicks: l.clicks,
      createdAt: l.createdAt,
      lastAccess: l.lastAccess,
    })),
  });
});


// ✅ Borrar un link (opcional, pero útil)
// DELETE /api/links/:code
app.delete("/api/links/:code", async (req, res) => {
  const { code } = req.params;

  const exists = await prisma.link.findUnique({ where: { code } });
  if (!exists) return res.status(404).json({ error: "No existe" });

  await prisma.link.delete({ where: { code } });
  res.json({ ok: true });
});


// Redirección AL FINAL
app.get("/:code", async (req, res) => {
  const { code } = req.params;
  if (code === "api") return res.status(404).send("Not found");

  const link = await prisma.link.findUnique({ where: { code } });
  if (!link) return res.status(404).send("Enlace no encontrado");

  await prisma.link.update({
    where: { code },
    data: { clicks: { increment: 1 }, lastAccess: new Date() },
  });

  res.redirect(link.originalUrl);
});

const port = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

app.listen(port, () => {
  console.log(`✅ API running: ${baseUrl}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});