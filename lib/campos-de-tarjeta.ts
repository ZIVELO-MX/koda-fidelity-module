import { z } from "zod"
import { ValidationError } from "@/lib/api-utils"

// POST y PUT de /api/cards validaban formas sueltas y el resto llegaba crudo a
// Prisma: `textColor: ["LIGHT"]`, `stampsRequired: 5.5`, una sorpresa `null` o
// `expiresAt: "x"` acababan en un 500 reintentable. Aquí van los tipos; los
// rangos que dependen de la tarjeta (sello de cada sorpresa, duplicados) siguen
// en cada ruta.
const COLOR = /^#[0-9a-f]{6}$/i
const texto = z.string().nullable().optional()

const campos = z.object({
  textColor: z.enum(["AUTO", "DARK", "LIGHT"]).optional(),
  stampsRequired: z.number().int().min(1).max(100).optional(),
  iconName: texto,
  stampIconName: texto,
  description: texto,
  expiresAt: z.string().refine((fecha) => fecha === "" || !Number.isNaN(Date.parse(fecha)), "Fecha inválida").nullable().optional(),
  milestoneRewards: z.array(z.object({
    stampNumber: z.number().int(),
    label: z.string(),
    iconName: texto,
    probability: z.number().int(),
  })).optional(),
})

/** Lanza `ValidationError` si un campo de la tarjeta no tiene el tipo esperado. */
export function validarCamposDeTarjeta(body: Record<string, unknown>, colorActual: string) {
  const resultado = campos.safeParse(body)
  if (!resultado.success) {
    const [problema] = resultado.error.issues
    throw new ValidationError(`${problema.path.join(".") || "body"}: ${problema.message}`)
  }
  // Solo se valida el color que cambia: el panel reenvía el guardado, y uno
  // viejo no debe impedir guardar lo demás. Se pinta en la tarjeta y los pases.
  if (body.brandColor !== undefined && body.brandColor !== colorActual && (typeof body.brandColor !== "string" || !COLOR.test(body.brandColor))) {
    throw new ValidationError("El color debe ser hexadecimal, como #ff6b35")
  }
}
