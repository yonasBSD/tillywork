<script setup lang="ts">
import stringUtils from '@/utils/string';

defineProps<{
  photo?: string;
  text?: string;
  color?: string;
  style?: any;
  size?: string | number | 'x-small' | 'small' | 'default';
  rounded?: string;
}>();
</script>

<template>
  <v-avatar
    :style="style"
    :image="photo"
    :text="text ? stringUtils.getInitials(text) : undefined"
    :color="!photo ? color ?? 'secondary' : undefined"
    :size="size ?? 'x-small'"
    :rounded="rounded"
    class="user-select-none text-xs"
  />
</template>
