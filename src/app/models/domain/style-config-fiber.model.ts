export interface StyleConfigFiberDtlDto {
    fibers_RowId?: number;
    fibers_Dtl_RowId: number;
    fiber_Id: number;
    fiber_Consumption_Id?: number;
    fiber_Ratio: number;
    knit_Type: string;
    is_Fiber_Dye: string;
    fiber_Color_Id: number;
    is_Active: string;
    eby: number;
    edate: Date;
}

export interface StyleConfigFibersDto {
    style_Id: number;
    color_RowId: number;
    fabric_RowId: number;
    panel_Id?: number;
    fibers_RowId: number;
    fibers_Dtl_RowId: number;
    fiber_Id?: number;
    is_Active: string;
    eby: number;
    edate: Date;
    styleConfigFiberDtls: StyleConfigFiberDtlDto[];
}
