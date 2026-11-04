import { emailButton, emailLayout, escapeHtml, firstName } from '@/lib/emails/layout'

export function verifyEmailMessage({ name, url }: { name: string; url: string }) {
  const first = firstName(name, 'deportista')
  const href = escapeHtml(url)

  const html = emailLayout({
    title: 'Confirmá tu cuenta',
    rows: `<tr><td style="padding:16px 32px 0;">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#ffffff;">Hola ${first}, confirmá tu cuenta</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#a3a3a3;">
            Recibimos tu registro en BoostSport. Para comprobar que este mail es tuyo y activar tu cuenta, tocá el botón.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;">${emailButton(url, 'Confirmar mi cuenta')}</td></tr>
        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#737373;">El botón vence en 24 horas. Si no funciona, copiá este link en el navegador:</p>
          <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${href}" style="color:#7cc6ee;">${href}</a></p>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#525252;">Si no creaste una cuenta en BoostSport, ignorá este mail: sin confirmar, la cuenta no se activa.</p>
        </td></tr>`,
  })

  const text = `Hola ${first}, confirmá tu cuenta en BoostSport.

Para comprobar que este mail es tuyo y activar tu cuenta, abrí este link (vence en 24 horas):
${url}

Si no creaste una cuenta en BoostSport, ignorá este mail.`

  return { subject: 'Confirmá tu cuenta en BoostSport', html, text }
}
