import nextConfig from "eslint-config-next"

export default [
  // Los entregables de diseño no son código de producto. `docs/design/support.js`
  // es un motor de terceros que se copia para ver el documento de temas.
  { ignores: ["docs/**"] },
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
