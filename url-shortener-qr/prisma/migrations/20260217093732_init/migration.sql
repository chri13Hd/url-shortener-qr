-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "lastAccess" TIMESTAMP(3),

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Link_code_key" ON "Link"("code");
