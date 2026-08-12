<script setup lang="ts">
import { computed, ref } from "vue";
import NativeCard from "./components/NativeCard.vue";

// Читает сценарий fixture из URL, чтобы acceptance tests не меняли исходный SFC.
const variant = new URLSearchParams(window.location.search).get("variant") ?? "fail";
const showConditional = ref(true);
const items = ["one", "two"];
const props: Record<string, string> = {
  "data-design-node": "42:200",
  "aria-label": "Pay",
};

// Выбирает одно значение P0 padding для Spike 1 сценария.
const paddingLeft = computed(() => (variant === "pass" ? "24px" : "20px"));
</script>

<template>
  <main>
    <button
      v-if="variant !== 'missing' && variant !== 'duplicate'"
      data-design-node="42:1337"
      :style="{ paddingLeft }"
    >
      Checkout
    </button>

    <template v-if="variant === 'duplicate'">
      <button data-design-node="42:1337" :style="{ paddingLeft }">One</button>
      <button data-design-node="42:1337" :style="{ paddingLeft }">Two</button>
    </template>

    <template v-if="variant === 'matrix'">
      <section data-design-node="42:1000">
        <span data-design-node="42:1001">Nested</span>
      </section>
      <NativeCard />
      <div v-if="showConditional" data-design-node="42:1002">Conditional</div>
      <ul>
        <li v-for="item in items" :key="item" :data-design-node="`42:100${items.indexOf(item) + 3}`">
          {{ item }}
        </li>
      </ul>
      <button v-bind="props">Spread</button>
    </template>
  </main>
</template>
