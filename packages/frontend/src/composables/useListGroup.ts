/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { DIALOGS } from '@/components/common/dialogs/types';
import { useCardsService } from '@/services/useCardsService';
import { useDialogStore } from '@/stores/dialog';
import { useSnackbarStore } from '@/stores/snackbar';
import {
  type ListStage,
  ListGroupOptions,
  FieldTypes,
  type View,
  type SortOption,
  type ListGroup,
  type Card,
  type FieldFilter,
  dayjs,
  type List,
  type QueryFilter,
  type ViewFilter,
} from '@tillywork/shared';
import { cloneDeep } from 'lodash';
import { useCard } from './useCard';
import type { Row } from '@tanstack/vue-table';
import { useListGroupsService } from '@/services/useListGroupsService';
import objectUtils from '@/utils/object';
import type { MaybeRef } from 'vue';

interface QueryConfig {
  hideCompleted: MaybeRef<boolean>;
  hideChildren: MaybeRef<boolean>;
  filters?: MaybeRef<QueryFilter>;
  sortBy?: MaybeRef<SortOption[]>;
}

export const useListGroup = ({
  props,
  cards,
  reactiveGroup,
}: {
  props: {
    listGroup: ListGroup | Row<ListGroup>;
    view: View;
    list: List;
  };
  cards: Ref<(Card | Row<Card>)[]>;
  reactiveGroup?: Ref<ListGroup>;
}) => {
  const isDragging = ref(false);

  const sortBy = computed<SortOption[]>(() =>
    props.view.options.sortBy ? [cloneDeep(props.view.options.sortBy)] : []
  );
  const hideCompleted = computed<boolean>(
    () => props.view.options.hideCompleted ?? false
  );
  const hideChildren = computed<boolean>(
    () => props.view.options.hideChildren ?? false
  );
  const filters = computed<QueryFilter>(() => {
    let listGroup: ListGroup;

    if ('original' in props.listGroup) {
      listGroup = props.listGroup.original as ListGroup;
    } else {
      listGroup = props.listGroup;
    }

    if (props.view.filters) {
      const viewFilters = {
        where: {
          and: [
            ...(cloneDeep(
              (props.view.filters as ViewFilter).where.quick?.and
            ) ?? []),
            ...(cloneDeep(
              (props.view.filters as ViewFilter).where.advanced?.and
            ) ?? []),
          ],
        },
      };

      return objectUtils.deepMergeObjects(
        viewFilters,
        cloneDeep(listGroup.filter) ?? {}
      );
    } else {
      return listGroup.filter ?? {};
    }
  });

  const queryConfig = computed<QueryConfig>(() => ({
    filters,
    hideChildren,
    hideCompleted,
    sortBy,
  }));

  const listGroup = computed(() =>
    'original' in props.listGroup ? props.listGroup.original : props.listGroup
  );
  const isDraggingDisabled = computed(() => {
    return sortBy.value && sortBy.value.length > 0;
  });

  const confirmDialogIndex = computed(() =>
    dialog.getDialogIndex(DIALOGS.CONFIRM)
  );

  const dialog = useDialogStore();
  const { showSnackbar } = useSnackbarStore();

  const { updateFieldValue, updateCardStage } = useCard();
  const {
    calculateCardOrder,
    useDeleteCardMutation,
    useUpdateCardListMutation,
  } = useCardsService();

  const { mutateAsync: deleteCard, isPending: isDeletingCard } =
    useDeleteCardMutation();
  const { mutateAsync: updateCardList } = useUpdateCardListMutation();

  const { useUpdateListGroupMutation } = useListGroupsService();
  const { mutateAsync: updateListGroup } = useUpdateListGroupMutation();

  function openCreateCardDialog(listGroup: ListGroup) {
    const cardData: Record<string, unknown> = {};

    if (listGroup.type === ListGroupOptions.FIELD) {
      const value = getGroupValue();

      switch (listGroup.field?.type) {
        case FieldTypes.DROPDOWN:
        case FieldTypes.LABEL:
        case FieldTypes.USER:
          cardData[listGroup.field!.slug] = value ? [value] : undefined;
          break;

        case FieldTypes.DATETIME:
        case FieldTypes.DATE:
          cardData[listGroup.field!.slug] = getGroupValue();
          break;
      }
    }

    dialog.openDialog({
      dialog: DIALOGS.CREATE_CARD,
      data: {
        list: props.list,
        type: props.list.defaultCardType,
        listStage: getGroupStage(listGroup),
        data: cardData,
        listStages: props.list.listStages,
      },
    });
  }

  function getGroupStage(group: ListGroup) {
    let stage: ListStage | undefined;

    if (group.type === ListGroupOptions.LIST_STAGE) {
      stage = props.list.listStages.find((stage) => {
        return stage.id == group.entityId;
      });
    }

    return stage ? { ...stage } : undefined;
  }

  function getGroupValue() {
    let value;
    switch (listGroup.value.field?.type) {
      case FieldTypes.DROPDOWN:
      case FieldTypes.LABEL:
        value = listGroup.value.field?.items?.find(
          (item) => item.item === listGroup.value.name
        )?.item;
        break;

      case FieldTypes.DATETIME:
      case FieldTypes.DATE: {
        const filter: FieldFilter = listGroup.value.filter?.where?.and?.find(
          (condition) =>
            (condition as FieldFilter).field ===
            `card.data.${listGroup.value.field?.slug ?? ''}`
        ) as FieldFilter;

        if (!filter) break;

        const today = new Date();
        today.setHours(23, 59, 59);

        switch (filter.operator) {
          case 'lt': {
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

            value = dayjs(yesterday).utc().format();
            break;
          }
          case 'gt': {
            const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

            value = dayjs(tomorrow).utc().format();
            break;
          }
          case 'between': {
            value = dayjs(today).utc().format();
            break;
          }
          default:
            value = undefined;
            break;
        }
        break;
      }

      case FieldTypes.USER:
        value = listGroup.value.entityId;
        break;
    }

    return value;
  }

  function onDragMove() {
    if (isDraggingDisabled.value) {
      isDragging.value = false;
      return false;
    }
  }

  function onDragStart() {
    isDragging.value = true;

    if (isDraggingDisabled.value) {
      showSnackbar({
        message: 'Dragging cards is only enabled when sorting is disabled.',
        color: 'error',
        timeout: 5000,
      });
    }
  }

  function onDragEnd() {
    isDragging.value = false;
  }

  function onDragUpdate(event: any) {
    const { newIndex } = event;
    isDragging.value = false;

    let previousCard = cards.value[newIndex - 1];
    let currentCard = cards.value[newIndex];
    let nextCard = cards.value[newIndex + 1];

    if ('original' in currentCard) {
      previousCard = (previousCard as Row<Card>)?.original;
      currentCard = (currentCard as Row<Card>).original;
      nextCard = (nextCard as Row<Card>)?.original;
    }

    handleUpdateCardOrder({
      currentCard,
      previousCard: previousCard as Card,
      nextCard: nextCard as Card,
    });
  }

  function onDragAdd(event: any) {
    const { newIndex } = event;
    isDragging.value = false;

    let previousCard = cards.value[newIndex - 1];
    let currentCard = cards.value[newIndex];
    let nextCard = cards.value[newIndex + 1];

    if ('original' in currentCard) {
      previousCard = (previousCard as Row<Card>)?.original;
      currentCard = (currentCard as Row<Card>).original;
      nextCard = (nextCard as Row<Card>)?.original;
    }

    const newOrder = calculateCardOrder({
      previousCard: previousCard as Card,
      nextCard: nextCard as Card,
    });

    switch (listGroup.value.type) {
      case ListGroupOptions.LIST_STAGE: {
        updateCardStage({
          cardId: currentCard.id,
          cardListId: currentCard.cardLists[0].id,
          listStageId: listGroup.value.entityId as number,
          order: newOrder,
        });
        break;
      }

      case ListGroupOptions.FIELD: {
        const newValue = getGroupValue();

        updateFieldValue({
          card: currentCard,
          field: listGroup.value.field!,
          v: newValue,
        });

        handleUpdateCardOrder({
          currentCard,
          previousCard: previousCard as Card,
          nextCard: nextCard as Card,
        });

        break;
      }
    }
  }

  function setDragItem(data: DataTransfer) {
    const img = new Image();
    img.src = 'https://en.wikipedia.org/wiki/File:1x1.png#/media/File:1x1.png';
    data.setDragImage(img, 0, 0);
  }

  function toggleGroupExpansion() {
    if (reactiveGroup) {
      reactiveGroup.value.isExpanded = !reactiveGroup.value.isExpanded;

      updateListGroup(reactiveGroup.value).catch(() => {
        showSnackbar({
          message: 'Something went wrong, please try again.',
          color: 'error',
          timeout: 5000,
        });
      });
    }
  }

  function handleDeleteCard(card: Card) {
    dialog.openDialog({
      dialog: DIALOGS.CONFIRM,
      data: {
        title: 'Confirm',
        message: `Are you sure you want to delete ${card.data.title}?`,
        onConfirm: () =>
          deleteCard(card.id)
            .then(() => {
              dialog.closeDialog(confirmDialogIndex.value);
            })
            .catch(() => {
              showSnackbar({
                message: 'Something went wrong, please try again!',
                color: 'error',
                timeout: 5000,
              });
            }),
        isLoading: isDeletingCard,
      },
    });
  }

  function handleUpdateCardOrder({
    currentCard,
    previousCard,
    nextCard,
  }: {
    currentCard: Card;
    previousCard?: Card;
    nextCard?: Card;
  }) {
    const newOrder = calculateCardOrder({
      previousCard,
      nextCard,
    });

    updateCardList({
      cardId: currentCard.id,
      cardListId: currentCard.cardLists[0].id,
      updateCardListDto: {
        order: newOrder,
      },
    }).catch(() => {
      showSnackbar({
        message: 'Something went wrong, please try again.',
        color: 'error',
        timeout: 5000,
      });
    });
  }

  return {
    openCreateCardDialog,
    onDragAdd,
    onDragEnd,
    onDragMove,
    onDragStart,
    onDragUpdate,
    setDragItem,
    isDragging,
    toggleGroupExpansion,
    handleDeleteCard,
    handleUpdateCardOrder,
    queryConfig,
  };
};
