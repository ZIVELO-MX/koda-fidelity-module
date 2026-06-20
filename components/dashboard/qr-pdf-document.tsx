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
}

export function QRPDFDocument({ card, businessName, businessLogo, qrDataUrl, size }: QRPDFDocumentProps) {
  const { width, height } = PDF_SIZES[size]
  const isCompact = size === "tarjeta"
  const isMedium = size === "media-carta"

  const logoSize = isCompact ? 28 : 36
  const qrSize = isCompact ? 150 : isMedium ? 180 : 220
  const fontSize = isCompact ? 9 : isMedium ? 11 : 12
  const titleSize = isCompact ? 13 : isMedium ? 16 : 18
  const rewardSize = isCompact ? 10 : isMedium ? 13 : 14

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
      marginBottom: isCompact ? 16 : 24,
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
      padding: isCompact ? 12 : 16,
      borderWidth: 1,
      borderColor: "#e5e7eb",
      marginBottom: isCompact ? 12 : 20,
      alignItems: "center",
    },
    qrImage: {
      width: qrSize,
      height: qrSize,
    },
    targetUrl: {
      fontSize: isCompact ? 5 : 7,
      color: "#9ca3af",
      marginTop: 4,
      fontFamily: "Helvetica",
    },
    divider: {
      width: "100%",
      height: 1,
      backgroundColor: "#e5e7eb",
      marginVertical: isCompact ? 12 : 20,
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
      color: card.brandColor,
      fontFamily: "Helvetica-Bold",
      textAlign: "center",
      marginBottom: isCompact ? 4 : 8,
    },
    stampsText: {
      fontSize: fontSize,
      color: "#6b7280",
      fontFamily: "Helvetica",
      textAlign: "center",
    },
    instructionsSection: {
      width: "100%",
      marginTop: isCompact ? 8 : "auto",
    },
    instructionsTitle: {
      fontSize: isCompact ? 8 : 10,
      fontFamily: "Helvetica-Bold",
      color: "#374151",
      marginBottom: isCompact ? 4 : 6,
    },
    instruction: {
      fontSize: isCompact ? 7 : 9,
      color: "#6b7280",
      fontFamily: "Helvetica",
      marginBottom: isCompact ? 2 : 3,
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
    compactInstructions: {
      marginTop: "auto",
      alignItems: "center",
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

          <Text style={styles.cardName}>{card.name}</Text>
          <Text style={styles.rewardText}>Recompensa: {card.reward}</Text>
          <Text style={styles.stampsText}>{card.stampsRequired} sellos para completar</Text>

          {isCompact ? (
            <View style={styles.compactInstructions}>
              <View style={styles.divider} />
              <Text style={[styles.instruction, { textAlign: "center", fontSize: 7 }]}>
                Escanea el código QR para obtener tu tarjeta de fidelidad
              </Text>
            </View>
          ) : (
            <View style={styles.instructionsSection}>
              <View style={styles.divider} />
              <Text style={styles.instructionsTitle}>¿Cómo funciona?</Text>
              <Text style={styles.instruction}>1. Escanea el código QR con la cámara de tu teléfono</Text>
              <Text style={styles.instruction}>2. Ingresa tu nombre y correo electrónico</Text>
              <Text style={styles.instruction}>3. Recibe tu tarjeta digital y comienza a acumular sellos</Text>
              <Text style={styles.instruction}>
                4. Al completar {card.stampsRequired} sellos, canjea tu recompensa: {card.reward}
              </Text>
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
