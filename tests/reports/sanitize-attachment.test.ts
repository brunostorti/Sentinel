import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from "pdf-lib";
import { sanitizeAttachment, AttachmentError } from "@/lib/reports/sanitize-attachment";

const IDENTITY = "Joao Teste da Silva";

function contains(bytes: Uint8Array, text: string): boolean {
  return Buffer.from(bytes).includes(Buffer.from(text, "latin1"));
}

async function photoWithMetadata(format: "jpeg" | "png") {
  const base = sharp({
    create: { width: 16, height: 8, channels: 3, background: { r: 200, g: 30, b: 30 } },
  }).withMetadata({
    orientation: 6,
    exif: { IFD0: { Artist: IDENTITY, Make: "Apple", Model: "iPhone 15" } },
  });
  return new Uint8Array(await (format === "jpeg" ? base.jpeg() : base.png()).toBuffer());
}

describe("sanitizeAttachment — fotos", () => {
  it("remove EXIF de JPEG (autor, aparelho) e aplica a orientação", async () => {
    const input = await photoWithMetadata("jpeg");
    expect((await sharp(input).metadata()).exif).toBeDefined();
    expect(contains(input, IDENTITY)).toBe(true);

    const out = await sanitizeAttachment(input, "image/jpeg");
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect(contains(out, IDENTITY)).toBe(false);
    expect(contains(out, "iPhone")).toBe(false);
    // orientação 6 = girar 90°: a imagem 16x8 passa a ser 8x16
    expect([meta.width, meta.height]).toEqual([8, 16]);
  });

  it("remove EXIF de PNG", async () => {
    const out = await sanitizeAttachment(await photoWithMetadata("png"), "image/png");
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("png");
    expect(meta.exif).toBeUndefined();
    expect(contains(out, IDENTITY)).toBe(false);
  });

  it("recusa arquivo que diz ser imagem mas não é", async () => {
    const fake = new TextEncoder().encode("isto não é uma imagem");
    await expect(sanitizeAttachment(fake, "image/png")).rejects.toBeInstanceOf(AttachmentError);
  });
});

/** Algum objeto do PDF ainda guarda autor/título/programa ou um bloco XMP? */
function hasIdentifyingObjects(doc: PDFDocument): boolean {
  const keys = ["Author", "Title", "Creator", "Producer"].map((k) => PDFName.of(k));
  return doc.context.enumerateIndirectObjects().some(([, obj]) => {
    const dict = obj instanceof PDFDict ? obj : obj instanceof PDFRawStream ? obj.dict : null;
    if (!dict) return false;
    return (
      keys.some((k) => dict.has(k)) ||
      dict.get(PDFName.of("Type")) === PDFName.of("Metadata")
    );
  });
}

describe("sanitizeAttachment — PDF", () => {
  it("remove autor, título, programa e XMP (inclusive objetos órfãos)", async () => {
    const doc = await PDFDocument.create();
    doc.setAuthor(IDENTITY);
    doc.setTitle("Relato pessoal");
    doc.setCreator("Word da Empresa X");
    const xmp = doc.context.stream(`<x:xmpmeta><dc:creator>${IDENTITY}</dc:creator></x:xmpmeta>`, {
      Type: "Metadata",
      Subtype: "XML",
    });
    doc.catalog.set(PDFName.of("Metadata"), doc.context.register(xmp));
    doc.addPage([200, 200]);
    const input = await doc.save({ useObjectStreams: false });

    const before = await PDFDocument.load(input, { updateMetadata: false });
    expect(before.getAuthor()).toBe(IDENTITY);
    expect(hasIdentifyingObjects(before)).toBe(true);
    expect(contains(input, IDENTITY)).toBe(true); // o XMP fica em texto puro

    const out = await sanitizeAttachment(input, "application/pdf");
    const after = await PDFDocument.load(out, { updateMetadata: false });
    expect(after.getAuthor()).toBeUndefined();
    expect(after.getTitle()).toBeUndefined();
    expect(after.catalog.has(PDFName.of("Metadata"))).toBe(false);
    expect(hasIdentifyingObjects(after)).toBe(false);
    expect(after.getPageCount()).toBe(1);
  });

  it("recusa arquivo que diz ser PDF mas não é", async () => {
    const fake = new TextEncoder().encode("nada de pdf aqui");
    await expect(sanitizeAttachment(fake, "application/pdf")).rejects.toBeInstanceOf(AttachmentError);
  });

  it("recusa tipos fora da lista", async () => {
    await expect(sanitizeAttachment(new Uint8Array([1, 2, 3]), "text/html")).rejects.toBeInstanceOf(
      AttachmentError
    );
  });
});
