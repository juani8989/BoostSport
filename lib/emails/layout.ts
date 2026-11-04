export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const firstName = (name: string, fallback: string) => escapeHtml(name.trim().split(/\s+/)[0] || fallback)

export function emailButton(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#0081c8;">
            <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
          </td></tr></table>`
}

/**
 * BoostSport frame for every email. Table-based layout and inline styles so it renders the
 * same in Gmail, Outlook and Apple Mail. `rows` are already-escaped <tr> blocks.
 */
export function emailLayout({ title, rows }: { title: string; rows: string }) {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ededed;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#111111;border:1px solid #262626;border-radius:16px;overflow:hidden;">
        <tr><td style="height:4px;font-size:0;line-height:0;background:linear-gradient(90deg,#0081c8,#fcb131,#000000,#00a651,#ee334e);">&nbsp;</td></tr>
        <tr><td style="padding:32px 32px 8px;">
          <p style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">Boost<span style="color:#fcb131;">Sport</span></p>
          <p style="margin:2px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#737373;">Sponsoreo deportivo</p>
        </td></tr>
        ${rows}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
