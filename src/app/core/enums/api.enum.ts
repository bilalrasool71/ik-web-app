export enum RequestType {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    DELETE = "DELETE"
}


export enum Repository {
    Auth = "Auth/",
    Catalog = "Catalog/",
    StyleConfiguration = "StyleConfiguration/",
    Order = "Order/",
    Contract = "Contract/"
}

export enum EndPoints {

    //#region Auth
    Auth = "Auth",
    //#endregion

    //#region Catalog
    AllCustomers = "GetAllCustomers",
    AllGenders = "GetAllGenders",
    AllProductTypes = "GetAllProductTypes",
    AllProductSubTypes = "GetAllProductSubTypes",
    AllSeasons = "GetAllSeasons",
    GetAllColors = "GetAllColors",
    GetAllPlacementsForPrint = "GetAllPlacementsForPrint",
    GetAllPlacementsForEmbroidery = "GetAllPlacementsForEmbroidery",
    GetAllPrintTypes = "GetAllPrintTypes",
    GetAllEmbTypes = "GetAllEmbTypes",
    GetAllDesignsForPrint = "GetAllDesignsForPrint",
    GetAllDesignsForEmbroidery = "GetAllDesignsForEmbroidery",
    GetAllGarmentWashTypes = "GetAllGarmentWashTypes",
    GetAllPanels = "GetAllPanels",
    GetAllFabricColors = "GetAllFabricColors",
    GetAllPrintColors = "GetAllPrintColors",
    GetAllPanelSizes = "GetAllPanelSizes",
    GetAllFabricConsumptions = "GetAllFabricConsumptions",
    GetAllDyeProcessRoute = "GetAllDyeProcessRoute",
    GetAllSpecialProcesses = "GetAllSpecialProcesses",
    GetAllFibers = "GetAllFibers",
    GetAllFiberColors = "GetAllFiberColors",
    GetAllFiberConsumptions = "GetAllFiberConsumptions",
    GetAllFabrics = "GetAllFabrics",
    GetAllCompositions = "GetAllCompositions",
    GetAllStyle = "GetAllStyle",
    //#endregion

    //#region StyleConfiguration
    GetAllAddsOnCatalog = "GetAllAddsOnCatalog",
    AddUpdateStyleConfigMain = "AddUpdateStyleConfigMain",
    AddUpdateStyleConfigColor = "AddUpdateStyleConfigColor",
    GetStyleConfigColorShortByStyleIdForFabric = "GetStyleConfigColorShortByStyleIdForFabric",
    AddUpdateStyleConfigFabricAsync = "AddUpdateStyleConfigFabricAsync",
    GetStyleConfigColorShortByStyleIdForFiberAsync = "GetStyleConfigColorShortByStyleIdForFiberAsync",
    GetStyleConfigFabricShortByStyleIdForFiberAsync = "GetStyleConfigFabricShortByStyleIdForFiberAsync",
    GetStyleConfigPanelShortByStyleIdForFiberAsync = "GetStyleConfigPanelShortByStyleIdForFiberAsync",
    AddUpdateStyleConfigFiberAsync = "AddUpdateStyleConfigFiberAsync",
    AddUpdateStyleConfigSizeConsumptionAsync = "AddUpdateStyleConfigSizeConsumptionAsync",
    RemoveStyleConfigSizeConsumptionAsync = "RemoveStyleConfigSizeConsumptionAsync",
    RemoveStyleConfigSizeConsumptionDtlAsync = "RemoveStyleConfigSizeConsumptionDtlAsync",
    RemoveStyleConfigColorAsync = "RemoveStyleConfigColorAsync",
    RemoveStyleConfigColorAddsonAsync = "RemoveStyleConfigColorAddsonAsync",
    RemoveStyleConfigFabricPanelAsync = "RemoveStyleConfigFabricPanelAsync",
    RemoveStyleConfigFiberAsync = "RemoveStyleConfigFiberAsync",
    RemoveStyleConfigFiberDtlAsync = "RemoveStyleConfigFiberDtlAsync",
    GetStyleConfigMainByStyleIdAsync = "GetStyleConfigMainByStyleIdAsync",
    GetAllStyleConfigurations = "GetAllStyleConfigurations",


    //#endregion


    //#region Order
    AddUpdateWorkOrder = "AddUpdateWorkOrder",
    GetAllWorkOrder = "GetAllWorkOrder",
    GetSingleWorkOrder = "GetSingleWorkOrder",
    //#endregion

    //#region Contract
    GetAllWoShortAsync = "GetAllWoShortAsync",
    GetStageItemsAsync = "GetStageItemsAsync",
    GetOrderStagesShortAsync = "GetOrderStagesShortAsync",
    GetAllPartiesByStageIdAsync = "GetAllPartiesByStageIdAsync",
    AddUpdateContractsAsync = "AddUpdateContractsAsync"
    //#endregion
}