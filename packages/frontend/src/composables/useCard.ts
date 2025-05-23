import { DIALOGS } from '@/components/common/dialogs/types';
import { useCardsService } from '@/services/useCardsService';

import { useDialogStore } from '@/stores/dialog';
import { useSnackbarStore } from '@/stores/snackbar';
import { useStateStore } from '@/stores/state';

import {
  assertNotNullOrUndefined,
  FieldTypes,
  type Card,
  type Field,
} from '@tillywork/shared';

import { cloneDeep } from 'lodash';
import type { MaybeRef, ComputedRef } from 'vue';

export const useCard = () => {
  const { showSnackbar } = useSnackbarStore();
  const dialog = useDialogStore();
  const { setHoveredCard } = useStateStore();

  const {
    useUpdateCardMutation,
    useDeleteCardMutation,
    useUpdateCardListMutation,
  } = useCardsService();
  const { mutateAsync: updateCard } = useUpdateCardMutation();
  const { mutateAsync: deleteCard, isPending: isDeleting } =
    useDeleteCardMutation();
  const { mutateAsync: updateCardList } = useUpdateCardListMutation();

  const { copy } = useClipboard();

  function updateFieldValue({
    card,
    field,
    v,
  }: {
    card: Card;
    field: Field;
    v: any;
  }): Promise<Card> {
    const cardCopy = ref(cloneDeep(card));
    cardCopy.value.data[field.slug] = normalizeFieldValue({ v, field });

    return updateCard({
      id: cardCopy.value.id,
      data: cardCopy.value.data,
    });
  }

  function normalizeFieldValue({ v, field }: { v: any; field: Field }) {
    let newValue: any;
    switch (field.type) {
      case FieldTypes.DROPDOWN:
      case FieldTypes.LABEL:
      case FieldTypes.USER:
      case FieldTypes.CARD:
        newValue = Array.isArray(v)
          ? v.map((item) => (item.item ? item.item : item.toString()))
          : v
          ? [v.item ? v.item : v.toString()]
          : undefined;
        break;
      case FieldTypes.CHECKBOX:
      case FieldTypes.NUMBER:
        newValue = v;
        break;
      default:
        newValue = Array.isArray(v)
          ? v.map((item) => (item.item ? item.item : item.toString()))
          : v
          ? v.toString()
          : undefined;
    }

    newValue = Array.isArray(newValue)
      ? newValue.length && !!newValue[0]
        ? newValue
        : undefined
      : newValue;

    return newValue;
  }

  function confirmDelete(card: Card, cb?: () => void) {
    dialog.openDialog({
      dialog: DIALOGS.CONFIRM,
      data: {
        message: `Are you sure you want to delete this ${
          card.type?.name.toLowerCase() ?? 'card'
        }?`,
        onConfirm: () => handleDeleteCard(card, cb),
      },
    });
  }

  function handleDeleteCard(card: Card, cb?: () => void) {
    if (!isDeleting.value) {
      deleteCard(card.id)
        .catch(() =>
          showSnackbar({
            message: `Something went wrong while deleting this ${
              card.type?.name.toLowerCase() ?? 'card'
            }`,
            color: 'error',
          })
        )
        .finally(() => {
          if (cb) {
            cb();
          }

          dialog.closeDialog(dialog.getDialogIndex(DIALOGS.CONFIRM));
        });
    }
  }

  function copyLink(card: Card, cb?: () => void) {
    const fullUrl = `${window.location.origin}/card/${card.id}`;
    copy(fullUrl).then(() => {
      showSnackbar({
        message: `${
          card.type?.name ?? 'Card'
        } link was copied to your clipboard.`,
      });

      if (cb) {
        cb();
      }
    });
  }

  function updateCardStage({
    cardId,
    cardListId,
    listStageId,
    order,
  }: {
    cardId: number;
    cardListId: number;
    listStageId: number;
    order?: number;
  }) {
    updateCardList({
      cardId,
      cardListId,
      updateCardListDto: {
        listStageId,
        order,
      },
    }).catch(() => {
      showSnackbar({
        message: 'Something went wrong, please try again.',
        color: 'error',
        timeout: 5000,
      });
    });
  }

  function handleHoverCard({
    isHovering,
    card,
  }: {
    isHovering: boolean;
    card: Card;
  }) {
    if (isHovering) {
      setHoveredCard(card);
    } else {
      setHoveredCard(null);
    }
  }

  function getCardTitle(
    card: MaybeRef<Card>,
    titleField?: MaybeRef<Field> | ComputedRef<Field | undefined>
  ) {
    const cardValue = toValue(card);
    const titleFieldValue = toValue(titleField);

    assertNotNullOrUndefined(cardValue, 'card');
    assertNotNullOrUndefined(cardValue.type, 'card.type');

    if (cardValue.type.titleTemplate) {
      return cardValue.type.titleTemplate.replace(
        /\{\{(\w+)\}\}/g,
        (_match: string, fieldSlug: string) => {
          return cardValue.data[fieldSlug] || '';
        }
      );
    } else if (titleFieldValue) {
      return cardValue.data[titleFieldValue.slug];
    } else {
      return '';
    }
  }

  return {
    updateFieldValue,
    normalizeFieldValue,
    confirmDelete,
    copyLink,
    updateCard,
    updateCardStage,
    handleHoverCard,
    getCardTitle,
  };
};
