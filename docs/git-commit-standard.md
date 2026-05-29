# Git Standard — Koda Fidelity Module

## Branch naming

```
<type>/<short-description>
```

**Types:**
| Type       | Usage                                   |
| ---------- | --------------------------------------- |
| `feat`     | New feature                             |
| `fix`      | Bug fix                                 |
| `chore`    | Maintenance (deps, config, etc.)        |
| `refactor` | Code refactor without functional change |
| `test`     | Add or modify tests                     |
| `docs`     | Documentation                           |

**Short description:** in English, hyphen-separated. Max 4-5 words.

**Examples:**
- `feat/landing-page-links`
- `fix/clock-import-error`
- `chore/deps-update`
- `refactor/auth-middleware`

---

## Commit messages

Format:

```
<type>: <short message>
```

- **type:** same as branch naming
- **Short message:** imperative, English, lowercase, no trailing period
- **Optional description:** after blank line

**Examples:**
```
fix: add missing Clock import from lucide-react
```
```
feat: add landing page hero section

Agrega hero con CTA y logo responsive.
```
```
chore: upgrade next to 14.2.0
```

---

## Pull Requests

### Title (English)
Same format as commit messages:
```
<type>: <short message in English>
```

### Body (Spanish)
- Use Spanish for descriptions
- Headers `## Cambios` and optionally `## Roadmap`
- Bullet points describing each change

**Example:**
```markdown
## Cambios

- Agregado `Clock` al import de `lucide-react` en `app/auth/error/page.tsx`
- Corregido error de compilación: `Cannot find name 'Clock'`

## Roadmap

- Item pendiente si aplica
```
