# Verificación de marcas y eventos (borrador interno)

> **Estado:** borrador para más adelante. Es un documento interno: no se implementa todavía ni se muestra a usuarios.
> Durante la beta cerrada, la verificación se hace a mano desde el panel de administración.
> Fecha: 2026-11-17

## Por qué

Hoy cualquiera puede crear una cuenta de marca (sponsor) o de evento (institución) con nombre, rubro, país, ciudad, web opcional, email y contraseña. Solo se confirma el email. Eso abre la puerta a cuentas fantasma: organizaciones que se registran, no hacen nada o, peor, cobran inscripciones a eventos que no existen.

Los atletas confían en BoostSport para conectar con sponsors y eventos reales. Una sola estafa con un evento falso alcanza para dañar la reputación de la app, sobre todo con el grupo inicial de atletas del COA.

## Principio general

La monetización y la verificación van **por debajo**: no son lo principal de la app. Registrarse tiene que seguir siendo fácil, y cada acción importante (escribirle a muchos atletas, publicar inscripciones, cobrar) pide un poco más de prueba de que la organización es real.

## Objetivos

- Que los atletas vean de un vistazo qué tan confiable es una marca o un evento.
- Que una cuenta fantasma no pueda cobrar ni hacer difusión masiva.
- Que una marca chica, sin web ni CUIT de empresa grande, igual pueda verificarse.

## No objetivos

- Verificar a los atletas: ya existe la verificación con selfie.
- Armar los cobros o las inscripciones pagas: es otro proyecto, que depende de este.

## Anti-objetivos

- Que registrarse se vuelva un trámite largo y las marcas abandonen en el alta.
- Pedir documentos que después nadie revisa.

## Niveles

| Nivel | Cómo se consigue | Qué habilita |
|---|---|---|
| **0 · Registrada** | Email confirmado (como hoy) | Armar el perfil y ver atletas. Contacto uno a uno con límite. |
| **1 · Básica** | Automático: email del dominio de su web, teléfono por código, o código pegado en la bio de su red social oficial | Contacto normal, publicar eventos sin cobro |
| **2 · Verificada** | CUIT válido y activo en el padrón de ARCA, con razón social que coincida. DNI y selfie del responsable (se reutiliza la verificación de atletas). Para eventos, algún respaldo: aval de federación, permiso municipal o ediciones anteriores. Lo revisa un admin. | Insignia de verificada, difusión, inscripciones pagas |
| **3 · Oficial** | Lo asigna un admin a mano (federaciones, COA, marcas reconocidas) | Insignia de oficial |

## Protecciones que van más allá de los papeles

- **El cobro sale a nombre del mismo CUIT:** la cuenta de Mercado Pago o Stripe del organizador tiene que coincidir con el CUIT verificado. La pasarela ya valida la identidad de quien cobra.
- **Plata retenida hasta que el evento ocurra:** el organizador cobra unos días después de la fecha del evento. Si el evento no se hace, se devuelve todo a los atletas.
- **Reseñas de atletas** después de un evento o de un trato, más el botón de denunciar que ya existe (tabla `reports`).
- **Inactividad:** una organización sin actividad en 60 días deja de aparecer en el feed y en el deck de match.

## Opciones consideradas

1. **Por niveles, con controles automáticos y revisión manual para el nivel alto** (elegida). Registrarse sigue siendo fácil y la confianza crece con el uso. La revisión manual queda solo para quienes quieren cobrar o hacer difusión.
2. **Todo manual desde el principio:** el admin aprueba cada cuenta antes de que pueda usar la app. Es seguro, pero frena el crecimiento y te deja como cuello de botella.
3. **Todo automático, con proveedores pagos de verificación de empresas:** escala, pero cuesta plata por cada verificación y es demasiado para el tamaño actual.

## Durante la beta

- Sin cambios en el alta.
- Un admin marca a mano como "verificada" u "oficial" a las organizaciones conocidas, desde el panel de administración.
- Para eso alcanza con un campo de nivel de verificación en el perfil de la organización (`OrgProfile`) y una insignia en su perfil y sus tarjetas.

## Para quien lo construya

- El orden propuesto es: insignia manual (beta) → nivel 1 automático → nivel 2 con cola de revisión en el panel de administración → retención de pagos, cuando existan las inscripciones pagas.
- Falta definir cómo consultar el padrón de ARCA (servicio oficial con certificado o control manual) y qué límites concretos tiene el nivel 0.
