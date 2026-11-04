import { emailButton, emailLayout, escapeHtml, firstName } from '@/lib/emails/layout'

/** Asks someone to fill in the profile items the admin picked, with a button back to the app. */
export function profileReminderMessage({ name, actions, note, appUrl, percent }: { name: string; actions: string[]; note?: string; appUrl: string; percent: number }) {
  const first = firstName(name, 'hola')
  const list = actions
    .map(
      (a) => `<tr><td style="padding:6px 0;font-size:15px;line-height:1.5;color:#ededed;">
                <span style="display:inline-block;width:18px;height:18px;margin-right:10px;border:2px solid #fcb131;border-radius:6px;vertical-align:-4px;"></span>${escapeHtml(a)}
              </td></tr>`,
    )
    .join('')
  const filled = Math.max(4, Math.min(100, percent))

  const html = emailLayout({
    title: 'Completá tu perfil',
    rows: `<tr><td style="padding:16px 32px 0;">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#ffffff;">${first}, te falta poco para completar tu perfil</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#a3a3a3;">
            Un perfil completo es lo que ven las marcas y los organizadores antes de contactarte. Hoy el tuyo está al <strong style="color:#ffffff;">${percent}%</strong>.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>
            <td style="height:8px;border-radius:999px;background:#262626;font-size:0;line-height:0;">
              <div style="width:${filled}%;height:8px;border-radius:999px;background:#fcb131;"></div>
            </td>
          </tr></table>
        </td></tr>
        ${note ? `<tr><td style="padding:0 32px 16px;"><p style="margin:0;padding:12px 14px;border-left:3px solid #0081c8;background:#0a0a0a;font-size:14px;line-height:1.6;color:#d4d4d4;">${escapeHtml(note)}</p></td></tr>` : ''}
        <tr><td style="padding:0 32px 8px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#737373;">Lo que te falta</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list}</table>
        </td></tr>
        <tr><td style="padding:16px 32px 0;">${emailButton(appUrl, 'Completar mi perfil')}</td></tr>
        <tr><td style="padding:16px 32px 32px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#525252;">Entrá con tu email y contraseña, andá a la pestaña Perfil y tocá «Mis datos» o «Editar perfil».</p>
        </td></tr>`,
  })

  const text = `${first}, te falta poco para completar tu perfil en BoostSport (hoy está al ${percent}%).
${note ? `\n${note}\n` : ''}
Lo que te falta:
${actions.map((a) => `- ${a}`).join('\n')}

Entrá a ${appUrl} con tu email y contraseña, andá a la pestaña Perfil y tocá «Mis datos» o «Editar perfil».`

  return { subject: 'Te falta poco para completar tu perfil en BoostSport', html, text }
}
