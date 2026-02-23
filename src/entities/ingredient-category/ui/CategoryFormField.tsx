'use client';

import * as React from 'react';

import { useBooleanState } from 'react-simplikit';

import { Button } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import { type IngredientCategoryOption } from '../model/types';

import { CategoryBottomSheet } from './CategoryBottomSheet';

type CategoryFormFieldApi = {
  name: string;
  state: {
    value: string;
    meta: {
      errors: unknown[];
    };
  };
  handleChange: (value: string) => void;
};

type CategoryFormFieldProps = {
  field: CategoryFormFieldApi;
  options: IngredientCategoryOption[];
  disabled?: boolean;
};

function CategoryFormField({ field, options, disabled = false }: CategoryFormFieldProps) {
  const [open, openCategorySheet, closeCategorySheet] = useBooleanState(false);
  const currentValue = String(field.state.value ?? '');
  const selectedCategory = React.useMemo(
    () => options.find((option) => option.id === currentValue) ?? null,
    [options, currentValue],
  );

  return (
    <>
      <Form.Field field={field}>
        <Form.Label required>카테고리</Form.Label>
        <Form.Control>
          <Button
            type="button"
            variant="outline"
            color="mono"
            onClick={openCategorySheet}
            disabled={disabled || options.length === 0}
            className="h-10 w-full justify-start"
          >
            {selectedCategory ? (
              <span className="inline-flex items-center gap-1.5">
                {selectedCategory.emoji ? (
                  <span className="font-tossface" aria-hidden>
                    {selectedCategory.emoji}
                  </span>
                ) : null}
                <span>{selectedCategory.label}</span>
              </span>
            ) : (
              '카테고리를 선택하세요'
            )}
          </Button>
        </Form.Control>
        <Form.Error />
      </Form.Field>
      <CategoryBottomSheet
        open={open}
        onOpenChange={(nextOpen) => (nextOpen ? openCategorySheet() : closeCategorySheet())}
        value={currentValue}
        onValueChange={field.handleChange}
        options={options}
      />
    </>
  );
}

export { CategoryFormField, type CategoryFormFieldApi, type CategoryFormFieldProps };
