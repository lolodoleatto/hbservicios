// Abrir y compartir los comprobantes en PDF (remito de pedido, comprobante
// de recarga). En el celular, compartir abre el selector nativo (WhatsApp
// entre las opciones) con el PDF adjunto. En la computadora, donde eso no
// siempre está, se abre el PDF y WhatsApp Web con un texto, para adjuntarlo
// a mano (un link de WhatsApp no puede llevar archivos, solo texto).

export function openPdf(blob) {
  window.open(URL.createObjectURL(blob), '_blank')
}

export async function sharePdf(blob, { filename, title }) {
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title })
  } else {
    openPdf(blob)
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `${title} de HB Servicios (adjuntá el PDF que se acaba de abrir/descargar)`,
      )}`,
      '_blank',
    )
  }
}
