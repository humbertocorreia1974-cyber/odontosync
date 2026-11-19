# Sistema de design — OdontoSync
Gerado com **UI/UX Pro Max** (curadoria de estilo + paleta + tipografia).
- **Estilo:** Minimalism & Swiss Style
- **Palavras-chave:** Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential
- **Modo:** light
- **Fontes:** Outfit (títulos) / Work Sans (corpo)
- **Efeitos:** Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading
- **Padrão de landing:** Hero + Features + CTA — Hero with headline/image > Value prop > Key features (3-5) > CTA section > Footer
## Tokens (CSS vars em `app/globals.css`)
```css
--bg: 226 100% 97%;
--surface: 0 0% 100%;
--surface-2: 223 54% 95%;
--border: 228 96% 89%;
--fg: 242 47% 34%;
--fg-muted: 215 19% 35%;
--brand: 239 84% 67%;
--brand-fg: 0 0% 0%;
--accent: 142 76% 36%;
--accent-fg: 0 0% 0%;
```
_Use SEMPRE os tokens (`bg-brand`, `text-fg`, `border-border`…), nunca hex cru._