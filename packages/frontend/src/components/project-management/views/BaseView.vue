<script setup lang="ts">
import { type List } from '../lists/types';
import { useViewsService } from '@/services/useViewsService';
import { useListGroupsService } from '@/services/useListGroupsService';
import BaseViewChipGroupBy from './BaseViewChipGroupBy.vue';
import BaseViewChipSort from './BaseViewChipSort.vue';
import TableView from './TableView/TableView.vue';
import { type TableSortOption } from './types';
import { DIALOGS } from '@/components/common/dialogs/types';
import { useQueryClient } from '@tanstack/vue-query';
import { useSnackbarStore } from '@/stores/snackbar';
import BoardView from './BoardView/BoardView.vue';
import ListView from './ListView/ListView.vue';
import BaseViewChipFilter from './BaseViewChipFilter/BaseViewChipFilter.vue';
import { useFitlersService } from '@/services/useFiltersService';
import { cloneDeep } from 'lodash';
import { useDialogStore } from '@/stores/dialog';
import BaseViewChipDisplay from './BaseViewChipDisplay.vue';
import {
  type QueryFilter,
  type Filter,
  FilterEntityTypes,
  type ViewFilter,
  type View,
  ViewTypes,
} from '@tillywork/shared';

const props = defineProps<{
  view: View;
  list: List;
}>();
const listId = computed(() => props.list.id);
const viewCopy = ref<View>(cloneDeep(props.view));
const viewsService = useViewsService();
const { useGetListGroupsByOptionQuery } = useListGroupsService();
const { useCreateFilterMutation, useUpdateFilterMutation } =
  useFitlersService();
const dialog = useDialogStore();
const { showSnackbar } = useSnackbarStore();
const queryClient = useQueryClient();

const hideCompleted = computed(() => viewCopy.value.options.hideCompleted);
const groupBy = computed({
  get() {
    return viewCopy.value.options.groupBy;
  },
  set(v) {
    viewCopy.value = {
      ...viewCopy.value,
      options: {
        ...viewCopy.value.options,
        groupBy: v,
      },
    };
  },
});

const sortBy = computed({
  get() {
    return viewCopy.value.options.sortBy;
  },
  set(v) {
    viewCopy.value = {
      ...viewCopy.value,
      options: {
        ...viewCopy.value.options,
        sortBy: v,
      },
    };
  },
});

const isViewLoading = ref(false);

const updateViewMutation = viewsService.useUpdateViewMutation();

const { data: listGroups, refetch: refetchListGroups } =
  useGetListGroupsByOptionQuery({
    listId,
    viewId: viewCopy.value.id,
    hideCompleted,
    groupBy,
  });

const { mutateAsync: createFilter } = useCreateFilterMutation();
const { mutateAsync: updateFilter } = useUpdateFilterMutation();

function handleGroupBySelection() {
  updateViewMutation.mutateAsync(viewCopy.value);
}

function handleSortBySelection(option: TableSortOption) {
  updateViewMutation.mutateAsync({
    ...viewCopy.value,
    options: {
      ...viewCopy.value.options,
      sortBy: option ?? null,
    },
  });
}

function openCreateCardDialog() {
  dialog.openDialog({
    dialog: DIALOGS.CREATE_CARD,
    data: {
      list: props.list,
      type: props.list.defaultCardType,
    },
  });
}

function handleUpdateFilters(filters: QueryFilter | null) {
  viewCopy.value = {
    ...viewCopy.value,
    filters: cloneDeep(filters) as Filter,
  };
}

function handleSaveFilters() {
  if (!props.view.filters) {
    createFilter({
      entityId: viewCopy.value.id,
      entityType: FilterEntityTypes.VIEW,
      name: 'Custom Filters',
      where: viewCopy.value.filters?.where ?? {},
    })
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: [
            'views',
            {
              listId: listId.value,
            },
          ],
        });
      })
      .catch(() => {
        showSnackbar({
          message: 'Something went wrong, please try again.',
          color: 'error',
        });
      });
  } else {
    updateFilter({
      id: props.view.filters.id,
      updateFilterDto: {
        where: viewCopy.value.filters?.where,
      },
    })
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: [
            'views',
            {
              listId: listId.value,
            },
          ],
        });
      })
      .catch(() => {
        showSnackbar({
          message: 'Something went wrong, please try again.',
          color: 'error',
        });
      });
  }
}

watch(
  () => props.view,
  (v) => {
    if (v) {
      viewCopy.value = { ...v };
      refetchListGroups();
    }
  }
);
</script>

<template>
  <div class="view-container" v-if="viewCopy">
    <div class="view-actions d-flex ga-2 py-4 px-6 overflow-auto">
      <v-btn
        class="text-none text-caption"
        variant="tonal"
        size="small"
        color="primary"
        @click="openCreateCardDialog"
      >
        <template #prepend>
          <v-icon icon="mdi-plus" />
        </template>
        Add {{ list.defaultCardType.name.toLocaleLowerCase() }}
      </v-btn>
      <div class="mx-1">
        <v-divider vertical />
      </div>
      <div class="d-flex align-center ga-2">
        <base-view-chip-group-by
          v-model="groupBy"
          @update:model-value="handleGroupBySelection"
        />
        <base-view-chip-filter
          :filters="(viewCopy.filters as ViewFilter)"
          :view-id="viewCopy.id"
          @update="handleUpdateFilters"
          @save="handleSaveFilters"
        />
        <base-view-chip-sort
          v-model="sortBy"
          @update:model-value="handleSortBySelection"
        />
        <base-view-chip-display v-model="viewCopy" />
      </div>
    </div>

    <div class="view">
      <template v-if="viewCopy.type === ViewTypes.TABLE">
        <table-view
          v-model:loading="isViewLoading"
          :list
          :view="viewCopy"
          :groups="listGroups ?? []"
        >
        </table-view>
      </template>
      <template v-else-if="viewCopy.type === ViewTypes.BOARD">
        <board-view :view="viewCopy" :list :list-groups="listGroups ?? []" />
      </template>
      <template v-else-if="viewCopy.type === ViewTypes.LIST">
        <list-view
          v-model:loading="isViewLoading"
          :list
          :view="viewCopy"
          :groups="listGroups ?? []"
          no-headers
        >
        </list-view>
      </template>
      <template v-else>
        <span class="text-body-3 text-error">Error: Unknown view type</span>
      </template>
    </div>
  </div>
</template>
