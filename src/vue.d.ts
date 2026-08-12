declare module "*.vue" {
  import type { DefineComponent } from "vue";

  // Описывает тип импортируемого Vue SFC для TypeScript без runtime-логики.
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}
