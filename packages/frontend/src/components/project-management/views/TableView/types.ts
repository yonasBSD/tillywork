import type { ColumnDef } from '@tanstack/vue-table';
import type { ListGroup } from '../../lists/types';
import type { Field, FieldTypes } from '@tillywork/shared';

export type TableColumnDef = ColumnDef<ListGroup, any> & {
  cellType: FieldTypes | 'actions' | 'title';
  field?: Field;
};
