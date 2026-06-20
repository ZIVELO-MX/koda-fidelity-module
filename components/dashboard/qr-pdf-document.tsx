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

export function QRPDFDocument({ card, businessName, businessLogo, qrDataUrl, size, ctaText }: QRPDFDocumentProps) {
  const { width, height } = PDF_SIZES[size]
  const isCompact = size === "tarjeta"
  const isMedium = size === "media-carta"

  const logoSize = isCompact ? 28 : 36
  const qrSize = isCompact ? 150 : isMedium ? 180 : 220
  const fontSize = isCompact ? 9 : isMedium ? 11 : 12
  const titleSize = isCompact ? 13 : isMedium ? 16 : 18
  const rewardSize = isCompact ? 10 : isMedium ? 13 : 14
  const ctaSize = isCompact ? 10 : isMedium ? 13 : 15

  const styles = StyleSheet.create({
    page: {
      padding: 0,
      backgroundColor: "#ffffff",
      fontFamily: "Helvetica",
    },
    brandBar: {
      height: isCompact ? 6 : 8,
      backgroundColor: card.brandColor,
    },
    content: {
      padding: isCompact ? 20 : isMedium ? 30 : 40,
      flex: 1,
      alignItems: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: isCompact ? 12 : 20,
      width: "100%",
      justifyContent: "center",
    },
    logoImage: {
      width: logoSize,
      height: logoSize,
      borderRadius: logoSize / 2,
      objectFit: "cover",
    },
    logoPlaceholder: {
      width: logoSize,
      height: logoSize,
      borderRadius: logoSize / 2,
      backgroundColor: card.brandColor,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderText: {
      color: "#ffffff",
      fontSize: logoSize * 0.45,
      fontFamily: "Helvetica-Bold",
    },
    businessName: {
      fontSize: isCompact ? 11 : isMedium ? 14 : 16,
      fontFamily: "Helvetica-Bold",
      color: "#1a1a1a",
    },
    qrWrapper: {
      backgroundColor: "#ffffff",
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: "#e5e7eb",
      marginBottom: isCompact ? 8 : 12,
      alignItems: "center",
    },
    qrImage: {
      width: qrSize,
      height: qrSize,
    },
    ctaSection: {
      width: "100%",
      marginBottom: isCompact ? 8 : 14,
      alignItems: "center",
    },
    ctaText: {
      fontSize: ctaSize,
      fontFamily: "Helvetica-Bold",
      color: card.brandColor,
      textAlign: "center",
      lineHeight: 1.4,
    },
    cardName: {
      fontSize: titleSize,
      fontFamily: "Helvetica-Bold",
      color: "#1a1a1a",
      textAlign: "center",
      marginBottom: isCompact ? 2 : 4,
    },
    rewardText: {
      fontSize: rewardSize,
      color: "#374151",
      fontFamily: "Helvetica",
      textAlign: "center",
      marginBottom: isCompact ? 4 : 8,
    },
    divider: {
      width: "100%",
      height: 1,
      backgroundColor: "#e5e7eb",
      marginVertical: isCompact ? 8 : 14,
    },
    instructionsSection: {
      width: "100%",
    },
    instruction: {
      fontSize: isCompact ? 6 : 8,
      color: "#6b7280",
      fontFamily: "Helvetica",
      marginBottom: isCompact ? 1 : 2,
      textAlign: "center",
    },
    footer: {
      width: "100%",
      textAlign: "center",
      paddingVertical: isCompact ? 8 : 12,
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
            <View style={styles.header}>
              {businessLogo ? (
                <Image style={styles.logoImage} src={businessLogo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.placeholderText}>{businessName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.businessName}>{businessName}</Text>
            </View>
          )}

          <View style={styles.qrWrapper}>
            <Image style={styles.qrImage} src={qrDataUrl} />
          </View>

          <View style={styles.ctaSection}>
            <Text style={styles.ctaText}>{ctaText}</Text>
          </View>

          <Text style={styles.cardName}>{card.name}</Text>
          <Text style={styles.rewardText}>
            {card.stampsRequired} sellos · Recompensa: {card.reward}
          </Text>

          {!isCompact && (
            <View style={styles.instructionsSection}>
              <View style={styles.divider} />
              <Text style={styles.instruction}>Escanea el código QR con tu teléfono y obtén tu tarjeta digital</Text>
              <Text style={styles.instruction}>Acumula sellos en cada visita y canjea tu recompensa</Text>
              <Text style={styles.instruction}>Sin apps — todo funciona desde tu navegador</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Con tecnología de Koda Fidelity</Text>
        </View>
      </Page>
    </Document>
  )
}
