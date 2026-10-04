import nextConfig from "eslint-config-next"

const config = [
  // Los entregables de diseño no son código de producto. `docs/design/support.js`
  // es un motor de terceros que se copia para ver el documento de temas.
  { ignores: ["docs/**", ".worktrees/**", ".pnpm-store/**"] },
  ...nextConfig,
  {
    rules: {
      "react-hooks/error-boundaries": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]

export default config
