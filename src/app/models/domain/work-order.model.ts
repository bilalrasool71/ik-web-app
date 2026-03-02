export class WorkOrderDto {
    customer!: number;
    style_Id!: number;
    wO!: number;
    eDate!: Date;
    rec_Date!: Date;
    orderStatus!: string;
    eBy!: number;
    eip!: string;
    lock_Flag!: string;
    mBy!: number;
    mip!: string;
    mDate!: Date;
    isClose!: boolean;
    close_Date!: Date;
    close_By!: number;
    close_Ip!: string;

    colorsDetailList!: WorkOrderColorDto[];    
}

export class WorkOrderColorDto {
    wO!: number;
    customer_pO!: number;
    color_RowId!: number;
    color_Id!: number;
    ship_Date!: Date;
    eDate!: Date;
    eBy!: number;
    eip!: string;
    mBy!: number;
    mip!: string;
    mDate!: Date;
    is_Active!: string;

    sizeDetailList!: WorkOrderColorSizeDto[];
}

export class WorkOrderColorSizeDto {
    wO!: number;
    color_RowId!: number;
    size_RowId!: number;
    size_Id!: number;
    qty!: number;
    excess_Qty!: number;
    uom!: number;
    eDate!: Date;
    eBy!: number;
    eip!: string;
    mBy!: number;
    mip!: string;
    mDate!: Date;
    is_Active!: string;

    wastages!: WorkOrderColorSizeWastageDto;
}

export class WorkOrderColorSizeWastageDto {
    wO!: number;
    color_RowId!: number;
    size_RowId!: number;
    wastage_Type!: number;
    wastage!: number;
    wast_RowId!: number;
} 