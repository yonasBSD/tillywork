<script setup lang="ts">
import { type Workspace } from '../workspaces/types';
import { useWorkspacesService } from '@/services/useWorkspacesService';
import CreateWorkspaceBtn from './CreateWorkspaceBtn.vue';
import { DIALOGS } from '@/components/common/dialogs/types';
import { useDialogStore } from '@/stores/dialog';
import { useAuthStore } from '@/stores/auth';
import { useStateStore } from '@/stores/state';

const dialog = useDialogStore();
const workspacesService = useWorkspacesService();
const selectWorkspaceMenu = ref(false);
const authStore = useAuthStore();
const { workspace: selectedWorkspace } = storeToRefs(authStore);
const { selectedModule } = storeToRefs(useStateStore());
const workspaceQuery = workspacesService.useGetWorkspacesQuery({
  type: selectedModule,
});
const { mutateAsync: deleteWorkspace, isPending: isDeleteLoading } =
  workspacesService.useDeleteWorkspaceMutation();

const confirmDialogIndex = computed(() =>
  dialog.getDialogIndex(DIALOGS.CONFIRM)
);

function closeSelectWorkspaceMenu() {
  selectWorkspaceMenu.value = false;
}

function handleSelectWorkspace(workspace: Workspace) {
  authStore.setWorkspace(workspace);
  closeSelectWorkspaceMenu();
}

function handleDeleteWorkspace(workspace: Workspace) {
  dialog.openDialog({
    dialog: DIALOGS.CONFIRM,
    data: {
      title: 'Confirm',
      message: 'Are you sure you want to delete this workspace?',
      onCancel: () => dialog.closeDialog(confirmDialogIndex.value),
      onConfirm: () =>
        deleteWorkspace(workspace.id).then(() => {
          selectedWorkspace.value = null;
          dialog.closeDialog(confirmDialogIndex.value);
        }),
      isLoading: isDeleteLoading.value,
    },
  });
}

watch(
  workspaceQuery.data,
  (workspaces) => {
    if (workspaces) {
      if (workspaces.length && !selectedWorkspace.value) {
        handleSelectWorkspace(workspaces[0]);
      }

      if (!workspaces.length) {
        selectedWorkspace.value = null;
      }

      if (workspaces.length && selectedWorkspace.value) {
        selectedWorkspace.value =
          workspaces.find((w) => w.id === selectedWorkspace.value?.id) ??
          workspaces[0];
      }
    }
  },
  { deep: true }
);
</script>

<template>
  <div class="d-flex justify-start align-center mt-4 px-2">
    <v-card
      density="compact"
      link
      id="workspace-menu-activator"
      class="me-2 user-select-none w-100"
      rounded="md"
      color="transparent"
    >
      <v-card-title
        class="d-flex align-center text-body-1 font-weight-medium pa-2px py-1 ps-2"
      >
        <base-avatar
          :text="selectedWorkspace?.name ?? 'N A'"
          color="rgb(116, 140, 7)"
          rounded="md"
          class="text-caption"
          size="x-small"
        />
        <span class="text-truncate text-body-3 mx-2">
          {{ selectedWorkspace?.name ?? 'Select a workspace' }}
        </span>
        <v-spacer />
        <v-icon>
          {{ selectWorkspaceMenu ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
        </v-icon>
      </v-card-title>
    </v-card>

    <base-icon-btn
      id="workspace-menu-btn"
      icon="mdi-dots-vertical"
      @click.stop
      v-show="selectedWorkspace"
    />

    <v-menu activator="#workspace-menu-btn">
      <v-card>
        <v-list>
          <v-list-item to="/settings/workspace">
            <template #prepend>
              <v-icon icon="mdi-briefcase-edit" />
            </template>
            <v-list-item-title>Edit workspace</v-list-item-title>
          </v-list-item>
          <v-list-item
            class="text-error"
            @click="handleDeleteWorkspace(selectedWorkspace!)"
          >
            <template #prepend>
              <v-icon icon="mdi-delete" />
            </template>
            <v-list-item-title>Delete</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </div>

  <v-menu
    v-model="selectWorkspaceMenu"
    :close-on-content-click="false"
    activator="#workspace-menu-activator"
  >
    <v-card class="pt-3 mt-2" width="300px" density="compact">
      <div class="px-5 text-truncate mb-2">
        <v-icon size="small">mdi-sitemap</v-icon>
        <span class="ml-1"> Your workspaces </span>
      </div>
      <v-list class="px-3" nav :lines="false">
        <v-list-item
          v-for="workspace in workspaceQuery.data.value"
          :key="workspace.id"
          @click="handleSelectWorkspace(workspace)"
          :active="selectedWorkspace?.id === workspace.id"
        >
          <v-list-item-title class="d-flex align-center user-select-none">
            <base-avatar
              :text="workspace.name"
              color="rgb(116, 140, 7)"
              size="x-small"
              rounded="md"
              class="text-caption me-2"
            />
            <span>{{ workspace.name }}</span>
          </v-list-item-title>
        </v-list-item>
      </v-list>
      <v-divider class="mt-2" />
      <v-card-actions>
        <create-workspace-btn />
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
