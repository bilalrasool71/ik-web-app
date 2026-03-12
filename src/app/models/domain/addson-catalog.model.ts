
export class AddsOnRequirementDto {
    addsOn_Requirements!: string;
    requirements_Id!: number;
}

export class AddsOnCatalogDto {
    addsOn_Id!: number;
    addsOn_Ds!: string;
    requirements!: AddsOnRequirementDto[];
}