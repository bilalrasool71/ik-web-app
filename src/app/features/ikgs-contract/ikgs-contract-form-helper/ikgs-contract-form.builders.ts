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

/** One item row under a color group: item1 (required) + item2 (input, auto-filled) */
export function createDyeingInputItem(fb: FormBuilder): FormGroup {
  return fb.group({
    item1_Id: [0],
    item1_Qty: [0],
    item2_Id: [0],
    item2_Qty: [0],
    material_RowId: [0],
    item2_material_RowId: [0],
  });
}

/** One color group: color dropdown + its item rows */
export function createDyeingRequiredItem(fb: FormBuilder): FormGroup {
  return fb.group({
    color_Id: [0],
    material_RowId: [0],
    inputItems: fb.array([createDyeingInputItem(fb)]),
  });
}

export function createDyeingEntry(fb: FormBuilder): FormGroup {
  return fb.group({
    ...createStageHeader(),
    required: fb.array([createDyeingRequiredItem(fb)]),    
  });
}

// ── Stage 3+: Cutting ─────────────────────────────────────────
export function createCuttingRequiredItem(fb: FormBuilder): FormGroup {
  return fb.group({
    material_Id: [0],
    qty: [0],
    material_RowId: [0],
  });
}

export function createCuttingSizeGroup(fb: FormBuilder): FormGroup {
  return fb.group({
    size_Id: [0],
    material_RowId: [0],
    items: fb.array([createCuttingRequiredItem(fb)]),
  });
}

export function createCuttingColorGroup(fb: FormBuilder): FormGroup {
  return fb.group({
    color_Id: [0],
    material_RowId: [0],
    sizes: fb.array([createCuttingSizeGroup(fb)]),
  });
}

export function createCuttingInputItem(fb: FormBuilder): FormGroup {
  return fb.group({
    material_Id: [0],
    qty: [0],
    material_RowId: [0],
  });
}

export function createCuttingInputColorGroup(fb: FormBuilder): FormGroup {
  return fb.group({
    color_Id: [0],
    material_RowId: [0],
    items: fb.array([createCuttingInputItem(fb)]),
  });
}

export function createCuttingEntry(fb: FormBuilder): FormGroup {
  return fb.group({
    ...createStageHeader(),
    required: fb.array([createCuttingColorGroup(fb)]),
    input: fb.array([createCuttingInputColorGroup(fb)]),
  });
}

// ── Sewing Entry (one DTL row) ────────────────────────────────────────────
export function createSewingEntry(fb: FormBuilder): FormGroup {
  return fb.group({
    stage_RowId: [0],
    party_Id:    [null],
    qty:         [0],
    uom_Id:      [null],
    fromDate:    [null],
    toDate:      [null],
    required:    fb.array([createSewingColorGroup(fb)]),
    input:       fb.array([createSewingInputColorGroup(fb)]),
  });
}

// ── Left Side ─────────────────────────────────────────────────────────────

// C — color group
export function createSewingColorGroup(fb: FormBuilder): FormGroup {
  return fb.group({
    color_Id:       [0],
    material_RowId: [0],
    sizes:          fb.array([createSewingSizeGroup(fb)]),
  });
}

// S — size group under color
export function createSewingSizeGroup(fb: FormBuilder): FormGroup {
  return fb.group({
    size_Id:        [0],
    material_RowId: [0],
    items:          fb.array([createSewingRequiredItem(fb)]),
  });
}

// R — required item under size
export function createSewingRequiredItem(fb: FormBuilder): FormGroup {
  return fb.group({
    material_Id:    [0],
    qty:            [0],
    material_RowId: [0],
  });
}

// ── Right Side ────────────────────────────────────────────────────────────

// IC — input color group (1 per C, same color value)
export function createSewingInputColorGroup(fb: FormBuilder): FormGroup {
  return fb.group({
    color_Id:       [0],
    material_RowId: [0],
    sizes:          fb.array([createSewingInputSizeGroup(fb)]),
  });
}

// IS — input size group (user selects from left sizes, max = left S count)
export function createSewingInputSizeGroup(fb: FormBuilder): FormGroup {
  return fb.group({
    size_Id:        [0],
    material_RowId: [0],
    items:          fb.array([createSewingInputItem(fb)]),
  });
}

// I — input item under IS (1 or more, has qty)
export function createSewingInputItem(fb: FormBuilder): FormGroup {
  return fb.group({
    material_Id:    [0],
    qty:            [0],
    material_RowId: [0],
  });
}