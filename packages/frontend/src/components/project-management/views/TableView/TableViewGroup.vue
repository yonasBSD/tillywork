<script setup lang="ts">
import {
  getCoreRowModel,
  useVueTable,
  type ColumnDef,
  type Row,
  type Table,
} from '@tanstack/vue-table';
import { useCardsService } from '@/services/useCardsService';
import draggable from 'vuedraggable';
import objectUtils from '@/utils/object';
import { cloneDeep } from 'lodash';
import BaseCardChildrenProgress from '../../cards/BaseCardChildrenProgress.vue';
import { useCard } from '@/composables/useCard';
import { useFields } from '@/composables/useFields';
import {
  ListGroupOptions,
  type QueryFilter,
  type ViewFilter,
  type View,
  FieldTypes,
  type ListGroup,
  type ListStage,
  type ProjectUser,
  type List,
  type Card,
  type SortState,
} from '@tillywork/shared';
import BaseField from '@/components/common/fields/BaseField.vue';
import { useListGroup } from '@/composables/useListGroup';

const props = defineProps<{
  listGroup: Row<ListGroup>;
  listStages: ListStage[];
  projectUsers: ProjectUser[];
  table: Table<ListGroup>;
  columnSizes: {
    id: string;
    size: number;
  }[];
  noGroupBanners?: boolean;
  view: View;
  list: List;
}>();

const rowMenuOpen = ref<Row<Card> | null>();
const isGroupCardsLoading = defineModel<boolean>('loading');

const cards = ref<Card[]>([]);

const { useGetGroupCardsInfinite } = useCardsService();

const { updateFieldValue } = useCard();

const { titleField } = useFields({
  cardTypeId: props.list.defaultCardType.id,
  listId: props.list.id,
});

const groupCopy = ref(cloneDeep(props.listGroup.original));
const sortBy = computed<SortState>(() =>
  props.view.options.sortBy ? [cloneDeep(props.view.options.sortBy)] : []
);
const tableSortState = computed(() =>
  sortBy.value?.map((sortOption) => {
    return { id: sortOption.key, desc: sortOption.order === 'desc' };
  })
);
const columns = computed(
  () => props.table._getColumnDefs() as ColumnDef<Card, unknown>[]
);

const groupHeight = computed(() => (cards.value.length ?? 0) * 33 + 33);
const maxHeight = computed(() =>
  props.listGroup.original.name === 'All' ? 'calc(100vh - 230px)' : 350
);

const filters = computed<QueryFilter>(() => {
  if (props.view.filters) {
    const viewFilters = {
      where: {
        and: [
          ...(cloneDeep((props.view.filters as ViewFilter).where.quick?.and) ??
            []),
          ...(cloneDeep(
            (props.view.filters as ViewFilter).where.advanced?.and
          ) ?? []),
        ],
      },
    };

    return objectUtils.deepMergeObjects(
      viewFilters,
      cloneDeep(props.listGroup.original.filter) ?? {}
    );
  } else {
    return props.listGroup.original.filter ?? {};
  }
});

const hideCompleted = computed<boolean>(() => props.view.options.hideCompleted);
const hideChildren = computed<boolean>(() => props.view.options.hideChildren);

const total = ref(0);

const { fetchNextPage, isFetching, hasNextPage, refetch, data } =
  useGetGroupCardsInfinite({
    listId: groupCopy.value.list.id,
    groupId: groupCopy.value.id,
    hideCompleted,
    hideChildren,
    filters,
    sortBy,
  });

const groupTable = useVueTable({
  get data() {
    return cards.value;
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
  getRowId: (row) => `${row.id}`,
  manualPagination: true,
  manualGrouping: true,
  manualSorting: true,
  columnResizeMode: 'onChange',
  initialState: {
    sorting: tableSortState.value,
  },
});

const draggableCards = ref(groupTable.getCoreRowModel().rows);

const {
  openCreateCardDialog,
  isDragging,
  setDragItem,
  onDragAdd,
  onDragEnd,
  onDragMove,
  onDragStart,
  onDragUpdate,
  toggleGroupExpansion,
  handleDeleteCard,
  handleUpdateCardStage,
} = useListGroup({
  props,
  cards: draggableCards,
  reactiveGroup: groupCopy,
});

async function handleGroupCardsLoad({
  done,
}: {
  done: (status?: any) => void;
}) {
  if (!isFetching.value && !isDragging.value) {
    fetchNextPage();

    if (hasNextPage.value) {
      done('ok');
    } else {
      done('empty');
    }
  } else {
    done('ok');
  }
}

function handleCardMenuClick({
  row,
  isOpen,
}: {
  row: Row<Card>;
  isOpen: boolean;
}) {
  if (isOpen) {
    rowMenuOpen.value = row;
  } else {
    rowMenuOpen.value = null;
  }
}

function getColumnSize(columnId: string) {
  const columnSize = props.columnSizes.find((cs) => cs.id === columnId);
  return columnSize?.size;
}

watch(
  data,
  (v) => {
    if (v) {
      cards.value = v?.pages.map((page) => page.cards).flat() ?? [];
      total.value = v?.pages[0].total ?? 0;
      draggableCards.value = groupTable.getCoreRowModel().rows;
    }
  },
  { immediate: true }
);

watch(
  () => props.view,
  () => {
    refetch();
  },
  { deep: true }
);

watch(
  () => props.listGroup,
  (v) => {
    if (v) {
      groupCopy.value = cloneDeep(v.original);
    }
  }
);

watchEffect(() => {
  if (isFetching.value) {
    isGroupCardsLoading.value = true;
  } else {
    isGroupCardsLoading.value = false;
  }
});
</script>

<template>
  <v-banner
    sticky
    lines="one"
    density="comfortable"
    :border="groupCopy.isExpanded ? 'b-thin' : 'none'"
    style="z-index: 10"
    v-if="!noGroupBanners"
  >
    <base-icon-btn
      :icon="groupCopy.isExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
      :color="groupCopy.isExpanded ? 'info' : 'default'"
      class="me-2"
      @click="toggleGroupExpansion"
    />
    <div>
      <template
        v-if="
          listGroup.original.type === ListGroupOptions.FIELD &&
          listGroup.original.field?.type === FieldTypes.USER
        "
      >
        <base-avatar
          :photo="listGroup.original.icon"
          :text="listGroup.original.name"
          size="x-small"
          class="text-caption"
        />
      </template>
      <template v-else>
        <v-icon :color="listGroup.original.color" size="small">
          {{ listGroup.original.icon ?? 'mdi-circle-slice-8' }}
        </v-icon>
      </template>
      <span class="text-body-3 ms-3">
        {{ listGroup.original.name }}
        <span class="ms-2 text-caption text-color-subtitle">
          {{ total }}
        </span>
      </span>
    </div>
    <base-icon-btn
      class="ms-4"
      icon="mdi-plus"
      @click="openCreateCardDialog(listGroup.original)"
    />
  </v-banner>
  <template v-if="groupCopy.isExpanded">
    <v-list
      class="pa-0 overflow-scroll"
      rounded="0"
      :height="groupHeight"
      :max-height="maxHeight"
      :lines="false"
    >
      <v-infinite-scroll
        :height="groupHeight"
        :max-height="maxHeight"
        @load="handleGroupCardsLoad"
      >
        <template #empty></template>
        <template #loading></template>
        <draggable
          v-model="draggableCards"
          :move="onDragMove"
          @start="onDragStart"
          @end="onDragEnd"
          @add="onDragAdd"
          @update="onDragUpdate"
          :setData="setDragItem"
          item-key="id"
          animation="100"
          ghost-class="v-list-item--active"
          group="cards"
        >
          <template #item="{ element: row }">
            <v-list-item
              class="pa-0"
              rounded="0"
              height="33"
              :to="`/pm/card/${row.original.id}`"
              :ripple="false"
            >
              <v-hover
                #="{ isHovering: isRowHovering, props: rowProps }"
                :disabled="isDragging"
              >
                <v-card
                  color="transparent"
                  v-bind="rowProps"
                  height="33"
                  class="table-row d-flex align-center text-body-3 flex-fill"
                  rounded="0"
                  link
                  :ripple="false"
                >
                  <template
                    v-for="cell in row.getVisibleCells()"
                    :key="cell.id"
                  >
                    <template
                      v-if="cell.column.columnDef.cellType === 'actions'"
                    >
                      <v-card
                        :width="getColumnSize(cell.column.columnDef.id)"
                        class="table-cell d-flex align-center fill-height pe-1"
                        rounded="0"
                        color="transparent"
                      >
                        <div
                          class="d-flex flex-fill justify-end ga-1"
                          v-if="isRowHovering || rowMenuOpen?.id === row.id"
                        >
                          <v-menu
                            @update:model-value="
                              (v: boolean) => handleCardMenuClick({ row, isOpen: v })
                            "
                          >
                            <template #activator="{ props }">
                              <base-icon-btn
                                v-bind="props"
                                icon="mdi-dots-vertical"
                                @click.prevent
                              />
                            </template>
                            <v-card class="border-thin">
                              <v-list>
                                <v-list-item
                                  class="text-error"
                                  @click="handleDeleteCard(row.original)"
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
                      </v-card>
                    </template>
                    <template
                      v-else-if="cell.column.columnDef.cellType === 'title'"
                    >
                      <v-card
                        :width="getColumnSize(cell.column.columnDef.id)"
                        class="d-flex align-center fill-height text-body-3 px-2 table-cell"
                        rounded="0"
                        color="transparent"
                      >
                        <list-stage-selector
                          :model-value="row.original.cardLists[0].listStage"
                          theme="icon"
                          rounded="circle"
                          :list-stages="listStages ?? []"
                          @update:modelValue="
                        (modelValue: ListStage) =>
                        handleUpdateCardStage({
                            cardId: row.original.id,
                            cardListId: row.original.cardLists[0].id,
                            listStageId: modelValue.id,
                        })
                    "
                          @click.prevent
                        />

                        <template v-if="titleField">
                          <span class="text-truncate ms-2">
                            {{ row.original.data[titleField.slug] }}
                          </span>
                        </template>
                        <template v-else>
                          <v-skeleton-loader type="text" width="100%" />
                        </template>

                        <!-- Progress -->
                        <base-card-children-progress
                          v-if="row.original.children.length > 0"
                          :card="row.original"
                          border="thin"
                          min-width="fit-content"
                          class="text-caption ms-2"
                          style="
                            padding-top: 2px !important;
                            padding-bottom: 2px !important;
                          "
                        />
                      </v-card>
                    </template>
                    <template v-else>
                      <v-card
                        :width="getColumnSize(cell.column.columnDef.id)"
                        class="table-cell d-flex align-center fill-height"
                        rounded="0"
                        color="transparent"
                        link
                      >
                        <base-field
                          class="flex-fill h-100"
                          :field="cell.column.columnDef.field"
                          :model-value="
                            row.original.data[cell.column.columnDef.field.slug]
                          "
                          rounded="0"
                          flex-fill
                          @update:model-value="
                            (v: any) => updateFieldValue({ 
                                card: row.original,
                                field: cell.column.columnDef.field,
                                v
                            })
                          "
                          table
                          @click.stop
                        />
                      </v-card>
                    </template>
                  </template>
                </v-card>
              </v-hover>
            </v-list-item>
          </template>
        </draggable>
      </v-infinite-scroll>
    </v-list>
  </template>
</template>
