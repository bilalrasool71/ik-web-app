export class StyleConfigSizeConsumptionDto {

    size_RowId!: number;
    style_Id!: number;
    color_RowId!: number;
    fabric_RowId!: number;
    is_Active!: string;
    eby!: number;
    edate!: Date;
    sizeConsumptionDtls!: StyleConfigSizeConsumptionDtlDto[];
}

export class StyleConfigSizeConsumptionDtlDto {
    size_RowId!: number;
    size_Dtl_RowId!: number;
    size_Id!: number;
    mtr_Conumpition!: number;
    kg_Consumption!: number;
    dye_Wast!: number;
    knit_Wast!: number;
    is_Active!: string;
    eby!: number;
    edate!: Date;
}