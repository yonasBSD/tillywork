import { DIALOGS } from '@/components/common/dialogs/types';

import { useProjectsService } from '@/services/useProjectsService';
import { useUsersService } from '@/services/useUsersService';
import { useWorkspacesService } from '@/services/useWorkspacesService';

import { useAuthStore } from '@/stores/auth';
import { useDialogStore } from '@/stores/dialog';
import { useStateStore } from '@/stores/state';
import { useThemeStore } from '@/stores/theme';
import { WorkspaceTypes } from '@tillywork/shared';

import posthog from 'posthog-js';
import { useTheme } from 'vuetify';

/**
 * Used in App.vue to handle application state. Sets the app's theme, selected module, and whether or not to trigger onboarding dialog.
 * @returns
 */
export const useState = () => {
  const { setSelectedModule, navigateToLastList } = useStateStore();
  const { selectedModule } = storeToRefs(useStateStore());
  const { isAuthenticated, setProject, setWorkspace, clearWorkspace } =
    useAuthStore();
  const { project, user, workspace } = storeToRefs(useAuthStore());

  const projectsEnabled = computed(() => !project.value && isAuthenticated());
  const workspacesEnabled = computed(
    () => !!project.value && isAuthenticated()
  );

  const dialog = useDialogStore();
  const route = useRoute();

  const { useGetWorkspacesQuery } = useWorkspacesService();
  const { useGetProjectsQuery } = useProjectsService();
  const { updateUserMutation } = useUsersService();

  const { mutateAsync: updateUser } = updateUserMutation();

  const { data: workspaces } = useGetWorkspacesQuery({
    enabled: workspacesEnabled,
  });
  const { data: projects } = useGetProjectsQuery({
    enabled: projectsEnabled,
  });

  function updateAppState() {
    if (!workspaces.value?.length) {
      // If no workspaces exist, open onboarding dialog
      dialog.openDialog({
        dialog: DIALOGS.ONBOARDING,
        options: {
          fullscreen: true,
          persistent: true,
        },
      });
    } else if (workspaces.value?.length) {
      if (selectedModule.value) {
        // If a module is selected, check for existing workspaces
        const moduleWorkspaces = workspaces.value?.filter(
          (w) => w.type === selectedModule.value
        );

        if (moduleWorkspaces.length) {
          // If module has workspaces, set the first one
          setWorkspace(moduleWorkspaces[0]);
        } else {
          // If module has no workspaces, clear selected workspace
          clearWorkspace();
        }
      } else {
        if (workspace.value) {
          // If a workspace is selected, make sure it still exists
          const existingWorkspace = workspaces.value.find(
            (w) => w.id === workspace.value?.id
          );

          if (existingWorkspace) {
            setSelectedModule(existingWorkspace.type);
            setWorkspace(existingWorkspace);
          } else {
            // If it doesn't exist, select first workspace
            setFirstWorkspace();
          }
        } else {
          // If no workspace is selected, and no module is selected, go to first workspace
          setFirstWorkspace();
        }
      }
    }
  }

  function setFirstWorkspace() {
    if (workspaces.value) {
      const fillerWorkspace = workspaces.value[0];
      setSelectedModule(fillerWorkspace.type);
      setWorkspace(fillerWorkspace);
    }
  }

  watch(
    route,
    () => {
      if (route.path.startsWith('/pm')) {
        setSelectedModule(WorkspaceTypes.PROJECT_MANAGEMENT);
      } else if (route.path.startsWith('/crm')) {
        setSelectedModule(WorkspaceTypes.CRM);
      }
    },
    { immediate: true }
  );

  /*
   * This handles setting the user's theme mode (dark or light)
   * across the application and setting it on Vuetify settings
   * when the application is opened and when the value is changed.
   * Default: dark
   */
  const { theme } = storeToRefs(useThemeStore());
  const appTheme = useTheme();
  watch(
    theme,
    (v) => {
      appTheme.global.name.value = v;
    },
    {
      immediate: true,
    }
  );

  watch(workspaces, (v) => {
    if (v) {
      updateAppState();
    }
  });

  watch(projects, (v) => {
    if (v && v.length && !project.value) {
      setProject(v[0]);
    }
  });

  watch(
    project,
    (v) => {
      if (v && user.value) {
        updateUser({
          ...user.value,
          project: v,
        });
      }
    },
    { immediate: true }
  );

  watch(
    user,
    (v) => {
      if (import.meta.env.MODE === 'production' && isAuthenticated()) {
        posthog.identify(`${v?.id}`, {
          email: v?.email,
          name: `${v?.firstName} ${v?.lastName}`,
        });
      }
    },
    { immediate: true }
  );

  watch(selectedModule, () => {
    updateAppState();
    navigateToLastList();
  });

  return {
    selectedModule,
  };
};
