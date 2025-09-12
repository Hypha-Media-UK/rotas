<template>
  <form @submit.prevent="$emit('submit')" class="base-form">
    <slot />
  </form>
</template>

<script setup lang="ts">
interface Emits {
  (e: 'submit'): void
}

defineEmits<Emits>()
</script>

<style scoped>
.base-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
</style>
