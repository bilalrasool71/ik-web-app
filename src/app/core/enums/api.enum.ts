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

    Order = "Order/",  //Work Order
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
    GetAllStyle = "GetAllStyle",
    //#endregion

    //#region StyleConfiguration
    GetAllAddsOnCatalog = "GetAllAddsOnCatalog",
    AddUpdateStyleConfigMain = "AddUpdateStyleConfigMain",
    AddUpdateStyleConfigColor = "AddUpdateStyleConfigColor",
    AddUpdateStyleConfigFabric = "AddUpdateStyleConfigFabric",
    //#endregion


    //#region Order == WorkOrder
    AddUpdateWorkOrder = "AddUpdateWorkOrder"
    //#endregion
}