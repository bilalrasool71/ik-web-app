// shared
export interface ItemQty {
  ItemName: string;
  Qty: number;
}

// yarn
export interface YarnProcurement {
  Party: string;
  Qty: number;
  UOM: string;
  FromDate: Date | null;
  ToDate: Date | null;
  Requireditems: ItemQty[];
}

// knitting
export interface KnittingInputItem {
  ItemName: string;
  Qty: number;
  RequiredInputs: ItemQty[];
}

export interface KnittingStage {
  Party: string;
  Qty: number;
  UOM: string;
  FromDate: Date | null;
  ToDate: Date | null;
  InputItems: KnittingInputItem[];
}

// dyeing
export interface DyeingItemInput {
  ItemName: string;
  Qty: number;
  RequiredInputs: ItemQty[];
}

export interface DyeingColorGroup {
  Color: string;
  ItemInputs: DyeingItemInput[];
}

export interface DyeingStage {
  Party: string;
  Qty: number;
  UOM: string;
  FromDate: Date | null;
  ToDate: Date | null;
  ColorInputs: DyeingColorGroup[];
}

// cutting
export interface CuttingColorData {
  Size: string;
  ItemName: string;
  Qty: number;
  RequiredInputs: ItemQty[];
}

export interface CuttingColorGroup {
  Color: string;
  ColorData: CuttingColorData[];
}

export interface CuttingStage {
  Party: string;
  Qty: number;
  UOM: string;
  FromDate: Date | null;
  ToDate: Date | null;
  ColorsGroup: CuttingColorGroup[];
}

// stages
export interface ContractStages {
  YarnProcure: boolean;
  Knitting: boolean;
  Dyeing: boolean;
  Cutting: boolean;
}

// root contract
export interface IkgsContract {
  WorkOrder: string;
  Stages: ContractStages;
  Yarn: YarnProcurement;
  Knitting: KnittingStage[];
  Dyeing: DyeingStage[];
  Cutting: CuttingStage[];
}
