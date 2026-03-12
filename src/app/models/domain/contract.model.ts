export interface ItemQty {
  ItemName: string;
  Qty: number | string;
}

export interface SizeItemQty {
  Size: string;
  ItemName: string;
  Qty: number | string;
}

// ==========================================
// STAGE INTERFACES
// ==========================================

export interface StagesConfig {
  YarnProcure: boolean;
  Knitting: boolean;
  Dyeing: boolean;
  Cutting: boolean;
}

export interface YarnStage {
  Party: string;
  Qty: string | number;
  UOM: string;
  FromDate: Date | string | null;
  ToDAte: Date | string | null;
  Requireditems: ItemQty[];
}

export interface KnittingStage {
  Party: string;
  Qty: string | number;
  UOM: string;
  FromDate: Date | string | null;
  ToDate: Date | string | null;
  RequiredItems: ItemQty[];
  InputItems: ItemQty[];
}

export interface DyeingColorInput {
  Color: string;
  ItemInputs: ItemQty[];
}

export interface DyeingStage {
  Party: string;
  Qty: string | number;
  UOM: string;
  FromDate: Date | string | null;
  ToDate: Date | string | null;
  ColorInputs: DyeingColorInput[];
  ItemsInput: ItemQty[];
}

export interface CuttingColorInput {
  Color: string;
  ItemsInputs: SizeItemQty[];
}

export interface CuttingInputGroup {
  Color: string;
  ItemsInputs: ItemQty[];
}

export interface CuttingStage {
  Party: string;
  Qty: string | number;
  UOM: string;
  FromDate: Date | string | null;
  ToDate: Date | string | null;
  ColorInputs: CuttingColorInput[];
  InputItems: CuttingInputGroup[];
}

// ==========================================
// ROOT FORM MODEL
// ==========================================

export interface IkgsContract {
  WorkOrder: string;
  stages: StagesConfig;
  Yarn: YarnStage;
  Knitting: KnittingStage[];
  Dyeing: DyeingStage[];
  Cutting: CuttingStage[];
}
