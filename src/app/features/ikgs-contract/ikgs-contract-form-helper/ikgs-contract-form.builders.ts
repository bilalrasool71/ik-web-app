import { FormBuilder, FormGroup, FormArray } from '@angular/forms';

export function createStageHeader(): object {
  return {
    stage_RowId: 0,
    party_Id: 0,
    qty: 0,
    uom_Id: 0,
    fromDate: null,
    toDate: null,
  };
}

export function createMaterialItem(fb: FormBuilder, fieldName: string): FormGroup {
  return fb.group({
    material_Id: [0],
    [fieldName]: [0],
    material_RowId: [0],
  });
}

export function createColorItemGroup(fb: FormBuilder): FormGroup {
  return fb.group({
    color_Id: [0],
    items: fb.array([createMaterialItem(fb, 'qty')]),
  });
}

export function createSizeItemGroup(fb: FormBuilder): FormGroup {
  return fb.group({
    size_Id: 0,
    items: fb.array([createMaterialItem(fb, 'qty')]),
  });
}

export function createColorSizeGroup(fb: FormBuilder): FormGroup {
  return fb.group({
    color_Id: 0,
    sizes: fb.array([createSizeItemGroup(fb)]),
  });
}

// ── Stage 0: Yarn ─────────────────────────────────────────────
export function createYarnEntry(fb: FormBuilder): FormGroup {
  return fb.group({
    ...createStageHeader(),
    yarnItems: fb.array([createMaterialItem(fb, 'fiber_Qty')]),
  });
}

// ── Stage 1: Knitting ─────────────────────────────────────────
export function createKnittingRequiredItem(fb: FormBuilder): FormGroup {
  return fb.group({
    material_Id: [0],
    item1_Qty: [0],
    material_RowId: [0],
    inputItems: fb.array([createMaterialItem(fb, 'item2_Qty')]),
  });
}

export function createKnittingEntry(fb: FormBuilder): FormGroup {
  return fb.group({
    ...createStageHeader(),
    required: fb.array([createKnittingRequiredItem(fb)]),
  });
}

// ── Stage 2: Dyeing ───────────────────────────────────────────
export function createDyeingEntry(fb: FormBuilder): FormGroup {
  return fb.group({
    ...createStageHeader(),
    color_Id: [0],
    required: fb.array([createColorItemGroup(fb)]),
    input: fb.array([createMaterialItem(fb, 'qty')]),
  });
}

// ── Stage 3+: Cutting ─────────────────────────────────────────
export function createCuttingEntry(fb: FormBuilder): FormGroup {
  return fb.group({
    ...createStageHeader(),
    color_Id: [null],
    size_Id: [null],
    required: fb.array([createColorSizeGroup(fb)]),
    input: fb.array([createColorItemGroup(fb)]),
  });
}
