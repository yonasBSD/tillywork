<script setup lang="ts">
import { useCommandStore } from '@/stores/command';
import { leaderKey } from '@/utils/keys';

const { isOpen } = storeToRefs(useCommandStore());

function openCommandPalette() {
  isOpen.value = true;
}
</script>

<template>
  <v-btn
    class="text-none text-caption"
    size="small"
    variant="outlined"
    border="thin"
    color="default"
    prepend-icon="mdi-help-circle-outline"
    @click="openCommandPalette()"
  >
    Commands
    <template #append>
      <div class="d-flex align-center ga-1 ms-3">
        <v-icon v-if="leaderKey === 'Cmd'" icon="mdi-apple-keyboard-command" />
        <span v-else class="text-xs">Ctrl</span>
        <span class="text-xs">K</span>
      </div>
    </template>
  </v-btn>
</template>
