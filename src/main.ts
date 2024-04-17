import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import WindTheme from "@/themes/wind";
import App from "./App.vue";

import "./themes/variables.css";
import "./themes/index.css";

const app = createApp(App);
app.use(createPinia());
app.use(PrimeVue, {
  unstyled: true,
  pt: WindTheme,
});

const FORBIDDEN_WARNS = ["Failed to resolve component"];

app.config.warnHandler = (msg, instance, trace) => {
  !FORBIDDEN_WARNS.some((warning) => msg.includes(warning)) &&
    console.warn("[Vue warn]: ".concat(msg).concat(trace));
};

app.mount("#app");
