import sharp from "sharp";
import { PDFDocument, PDFName, PDFRef } from "pdf-lib";

/** Tipo MIME aceito → extensão gravada (os mesmos tipos do limite do bucket). */
export const ATTACHMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export class AttachmentError extends Error {}

/**
 * Remove de um anexo os dados escondidos que podem identificar quem o criou.
 *
 * - Fotos: regravadas sem EXIF/XMP/ICC (GPS, modelo do aparelho, dono, data). A orientação
 *   do EXIF é aplicada antes, para a imagem não ficar de lado.
 * - PDF: sai o dicionário de informações (autor, título, programa, datas) e o XMP do documento.
 *
 * Um arquivo que não abre como o tipo declarado é recusado.
 */
export async function sanitizeAttachment(bytes: Uint8Array, mime: string): Promise<Uint8Array> {
  if (mime === "image/jpeg" || mime === "image/png") {
    try {
      const image = sharp(bytes).rotate();
      const out = mime === "image/jpeg"
        ? await image.jpeg({ quality: 90 }).toBuffer()
        : await image.png().toBuffer();
      return new Uint8Array(out);
    } catch {
      throw new AttachmentError("Não foi possível ler uma das imagens anexadas.");
    }
  }

  if (mime === "application/pdf") {
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch (e) {
      const encrypted = e instanceof Error && /encrypt/i.test(e.message);
      throw new AttachmentError(
        encrypted
          ? "PDF protegido por senha não é aceito. Envie uma versão sem senha."
          : "Não foi possível ler um dos PDFs anexados."
      );
    }

    const info = doc.context.trailerInfo.Info;
    if (info instanceof PDFRef) doc.context.delete(info);
    doc.context.trailerInfo.Info = undefined;

    const metadataKey = PDFName.of("Metadata");
    const xmp = doc.catalog.get(metadataKey);
    if (xmp instanceof PDFRef) doc.context.delete(xmp);
    doc.catalog.delete(metadataKey);

    return await doc.save();
  }

  throw new AttachmentError("Anexos aceitos: PDF, JPG ou PNG.");
}
