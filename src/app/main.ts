// Vite entry point for the revamped OCPP Client Log Parser.
// Phase 0 scaffold — the application shell is built up phase by phase
// (parse → detect → health → protocol → ws → render → repository → …).

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.textContent = 'OCPP Client Log Parser — revamp scaffold (Phase 0).';
}
