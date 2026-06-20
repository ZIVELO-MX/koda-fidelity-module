import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer"
import { PDF_SIZES, type PdfSizeKey } from "@/lib/qr-pdf-utils"

interface CardData {
  id: string
  name: string
  reward: string
  stampsRequired: number
  brandColor: string
  iconName: string | null
}

interface QRPDFDocumentProps {
  card: CardData
  businessName: string
  businessLogo: string | null
  qrDataUrl: string
  size: PdfSizeKey
  ctaText: string
}

export function QRPDFDocument({ card, businessName, qrDataUrl, size, ctaText }: QRPDFDocumentProps) {
  const { width, height } = PDF_SIZES[size]
  const isCompact = size === "tarjeta"
  const isMedium = size === "media-carta"

  const pad = size === "carta" ? 36 : size === "media-carta" ? 28 : 18
  const brandBarHeight = 8
  const qrSize = isCompact ? 150 : isMedium ? 180 : 220
  const businessSize = isCompact ? 0 : 14
  const titleSize = size === "carta" ? 16 : size === "media-carta" ? 14 : 11
  const rewardSize = 11
  const ctaSize = size === "carta" ? 14 : size === "media-carta" ? 12 : 10

  const styles = StyleSheet.create({
    page: {
      padding: 0,
      backgroundColor: "#ffffff",
      fontFamily: "Helvetica",
    },
    brandBar: {
      height: brandBarHeight,
      backgroundColor: card.brandColor,
    },
    content: {
      padding: pad,
      flex: 1,
      alignItems: "center",
    },
    businessName: {
      fontSize: businessSize,
      fontFamily: "Helvetica-Bold",
      color: "#1a1a1a",
      marginBottom: 18,
      textAlign: "center",
    },
    qrImage: {
      width: qrSize,
      height: qrSize,
      marginBottom: 12,
    },
    ctaSection: {
      width: "100%",
      marginBottom: 6,
      alignItems: "center",
    },
    ctaText: {
      fontSize: ctaSize,
      fontFamily: "Helvetica-Bold",
      color: card.brandColor,
      textAlign: "center",
      lineHeight: 1.3,
    },
    cardName: {
      fontSize: titleSize,
      fontFamily: "Helvetica-Bold",
      color: "#1a1a1a",
      textAlign: "center",
      marginBottom: 4,
    },
    rewardText: {
      fontSize: rewardSize,
      color: "#374151",
      fontFamily: "Helvetica",
      textAlign: "center",
    },
    footer: {
      width: "100%",
      textAlign: "center",
      paddingHorizontal: pad,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: "#e5e7eb",
    },
    footerText: {
      fontSize: isCompact ? 6 : 8,
      color: "#9ca3af",
      fontFamily: "Helvetica",
    },
  })

  return (
    <Document>
      <Page size={[width, height]} style={styles.page}>
        <View style={styles.brandBar} />
        <View style={styles.content}>
          {!isCompact && (
            <Text style={styles.businessName}>{businessName}</Text>
          )}

          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not support alt. */}
          <Image style={styles.qrImage} src={qrDataUrl} />

          <View style={styles.ctaSection}>
            <Text style={styles.ctaText}>{ctaText}</Text>
          </View>

          <Text style={styles.cardName}>{card.name}</Text>
          <Text style={styles.rewardText}>
            {card.stampsRequired} sellos · Recompensa: {card.reward}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Con tecnología de Koda Fidelity</Text>
        </View>
      </Page>
    </Document>
  )
}
