export interface ContractsMaterialsDto {
    contract_Id?: number | null;
    stage_id?: number | null;
    stage_rowId?: number;
    material_rowId?: number | null;
    item_id?: number | null;
    party_id?: number | null;
    qty?: number | null;
    uom?: number | null;
    eby?: number | null;
    eip?: string | null;
    edat?: string | null;
    is_active?: string | null;
}

export interface ContractsStagesDtlDto {
    contract_Id: number;
    stage_Id: number;
    stage_rowid: number;
    party_Id?: number;
    color_id?: number;
    size_id?: number;
    req_Qty?: number;
    uom?: string;
    plan_sdat?: string;
    plan_edat?: string;
    achQty?: number;
    actSdat?: string;
    actEdat?: string;
    eby?: number | null;
    edat?: string | null;
    is_active?: string | null;
    materialsList: ContractsMaterialsDto[];
}

export interface ContractsStagesDto {
    contract_Id?: number;
    stage_Id: number;
    is_active?: string;
    stageDtlList: ContractsStagesDtlDto[];
}

export interface ContractsMasterDto {
    contract_Id: number;
    wo: number;
    lock_flag?: string;
    eby?: number;
    eip?: string;
    edat?: string;
    lockBy?: number;
    lockIp?: string;
    lockDate?: string;
    mBy?: number;
    mIp?: string;
    mDate?: string;
    stagesList?: ContractsStagesDto[];
}