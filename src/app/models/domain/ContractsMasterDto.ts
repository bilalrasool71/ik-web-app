export interface ContractsMaterialsDto {
  contract_Id?: number | null;
  stage_Id?: number | null;
  stage_RowId?: number | null;
  material_RowId: number;
  item_Id?: number | null;
  party_Id?: number | null;
  qty?: number | null;
  uom?: number | null;
  eBy?: number | null;
  eIp?: string | null;
  eDat?: string | null;
  is_Active?: string | null;
  mat_Type?: string;
  parent_Mat_RowId?: number;
}

export interface ContractsStagesDtlDto {
  contract_Id: number;
  stage_Id: number;
  stage_RowId: number;
  party_Id?: number | null;
  color_Id?: number | null;
  size_Id?: number | null;
  req_Qty?: number | null;
  uom?: number | null;
  plan_SDat?: string | null;
  plan_EDat?: string | null;
  ach_Qty?: number | null;
  act_SDat?: string | null;
  act_EDat?: string | null;
  eBy?: number | null;
  eDat?: string | null;
  is_Active?: string | null;
  materialsList?: ContractsMaterialsDto[] | null;
}

export interface ContractsStagesDto {
  contract_Id?: number;
  stage_Id: number;
  is_Active?: string | null;
  stageDtlList: ContractsStagesDtlDto[];
}

export interface ContractsMasterDto {
  contract_Id?: number | null;
  wo?: number | null;
  lock_Flag?: string | null;
  eBy?: number | null;
  eIp?: string | null;
  eDat?: string | null;
  lockBy?: number | null;
  lockIp?: string | null;
  lockDate?: string | null;
  mBy?: number | null;
  mIp?: string | null;
  mDate?: string | null;
  stagesList?: ContractsStagesDto[] | null;
}
