export class WorkOrderDto {
    customer!: number;
    style_Id!: number;
    wo!: number;
    edate!: string;
    rec_Date!: string;
    order_Staus!: string;
    eby!: number;
    eip!: string;
    lock_Flag!: string;
    mby!: number;
    mip!: string;
    mdate!: string;
    isClose!: boolean;
    close_Date!: string;
    close_By!: number;
    close_Ip!: string;


    //Temp
    knitting_Waste!: number;
    dyeing_Waste!: number;
    cutting_Waste!: number;
    printing_Waste!: number;
    embroidery_Waste!: number;
    gWP_Laundry_Waste!: number;
    sewing_Waste!: number;


    colorsDetailList!: WorkOrderColorDto[];
}

export class WorkOrderColorDto {
    wo!: number;
    customer_Po!: number;
    color_RowId!: number;
    color_Id!: number;
    ship_Date!: string | Date;
    edate!: string;
    eby!: number;
    eip!: string;
    mby!: number;
    mip!: string;
    mdate!: string;
    is_Active!: string;


    sizeDetailList!: WorkOrderColorSizeDto[];
}

export class WorkOrderColorSizeDto {
    wo!: number;
    color_RowId!: number;
    size_RowId!: number;
    size_Id!: number;
    qty!: number;
    excess_Qty!: number;
    uom!: number;
    edate!: string;
    eby!: number;
    eip!: string;
    mby!: number;
    mip!: string;
    mdate!: string;
    is_Active!: string;


    wastagesList!: WorkOrderColorSizeWastageDto[];
}

export class WorkOrderColorSizeWastageDto {
    wo!: number;
    color_RowId!: number;
    size_RowId!: number;
    wastage_Type!: number;
    wastage!: number;
    wast_RowId!: number;
}

export class WorkOrderStageItemDto {
    item_Id!: number;
    item_Name!: string;
    qty!: number;
}