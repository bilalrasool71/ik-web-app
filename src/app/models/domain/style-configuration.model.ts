import { StyleConfigColorDto } from "./style-config-color.model";
import { StyleConfigFabricDto } from "./style-config-fabric.model";
import { StyleConfigFibersDto } from "./style-config-fiber.model";
import { StyleConfigSizeConsumptionDto } from "./style-config-size-consumption.model";

export class StyleConfigMainDto {
    style_Id!: number;
    customer_Id!: number;
    customer_Style!: string;
    config_Type!: string;
    season_Id!: number;
    gender_Id!: number;
    lead_Days!: number;
    product_Type_Id!: number;
    product_Sub_Type_Id!: number;
    fabric_Gsm!: number;
    garment_Gsm!: number;
    style_Description!: string;
}

export class StyleConfigMainDsDto extends StyleConfigMainDto {
    customer_Ds!: string;
    config_Type_Ds!: string;
    season_Name!: string;
    gender_Ds!: string;
    product_Type_Ds!: string;
    product_Sub_Type_Ds!: string;
}

export class GetStyleConfigMainDto {
    styleConfigMain!: StyleConfigMainDto;
    styleConfigColorList!: StyleConfigColorDto[];
    styleConfigFabricList!: StyleConfigFabricDto[];
    styleConfigFibers!: StyleConfigFibersDto[];
    styleConfigSizeConsumptionList!: StyleConfigSizeConsumptionDto[];
}