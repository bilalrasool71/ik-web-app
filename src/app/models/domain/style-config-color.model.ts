export class StyleConfigColorDto {
    style_Id!: number;
    color_RowId!: number;
    color_Id!: number;
    adds_On!: string;
    adds_On_Id!: number;
    is_Active!: string;
    eby!: number;
    edate!: Date;
    addsOnList!: StyleConfigColorAddsOnDto[];
}

export class StyleConfigColorAddsOnDto {
    style_Id!: number;
    color_RowId!: number;
    addson_RowId!: number;
    addson_Type_Id!: number;
    placement_Id!: number;
    addson_Subtype_Id!: number;
    addson_Process_Id!: number;
    is_Active!: string;
    eby!: number;
    edate!: Date;
}