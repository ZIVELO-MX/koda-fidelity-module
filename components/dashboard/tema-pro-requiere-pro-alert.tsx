export function TemaProRequiereProAlert() {
  return (
    <div role="alert" className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
      <p>Esta tarjeta tiene un tema Pro y no puede guardarse con el plan Lite. Contacta a soporte si quieres cambiar de plan.</p>
      <a className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4" href="mailto:soporte@zivelo.dev?subject=Cambio%20de%20plan%20Zivelo">
        Escribir a soporte
      </a>
    </div>
  )
}
