import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import "./index.css";

const app = createApp(App);
app.use(createPinia());

const FORBIDDEN_WARNS = ["Failed to resolve component"];

app.config.warnHandler = (msg, instance, trace) => {
  !FORBIDDEN_WARNS.some((warning) => msg.includes(warning)) &&
    console.warn("[Vue warn]: ".concat(msg).concat(trace));
};

app.mount("#app");
