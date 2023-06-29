const isProd = process.env.NODE_ENV;

module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  plugins: ["@typescript-eslint"],
  parser: "vue-eslint-parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parser: "@typescript-eslint/parser",
  },
  rules: {
    "no-console": isProd ? "error" : "off",
    "no-debugger": isProd ? "error" : "off",
    "vue/multi-word-component-names": "off",
    "vue/attributes-order": ["error"],
  },
  overrides: [
    {
      files: "*.vue",
      extends: ["@vue/typescript/recommended", "plugin:vue/vue3-recommended"],
      rules: {
        "vue/multi-word-component-names": ["off"],
      },
      globals: {
        NodeJS: true,
        components: "readable",
        filters: "readable",
        created: "readable",
        mounted: "readable",
      },
    },
    {
      files: "*.ts",
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
      ],
      rules: {
        "no-console": ["off"],
        "@typescript-eslint/no-explicit-any":['off']
      },
    },
  ],
};
