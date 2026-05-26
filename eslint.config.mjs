import nextConfig from "eslint-config-next"

export default [
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
